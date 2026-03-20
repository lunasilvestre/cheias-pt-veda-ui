# How to Load Data to cheias.pt eoAPI

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  eoAPI on Sliplane (api.cheias.pt)                      │
│                                                         │
│  nginx :8080 ─┬─ / ────────→ stac-fastapi :8081 (pgstac)│
│               ├─ /raster/ ──→ titiler-pgstac :8082      │
│               └─ /vector/ ──→ tipg :8083 (PostGIS)      │
│                                                         │
│  PostgreSQL: Neon.tech (Frankfurt)                       │
│  ├── pgstac schema (STAC collections + items)           │
│  └── public schema (PostGIS vector tables)              │
│                                                         │
│  COGs: Cloudflare R2 (data.cheias.pt)                   │
└─────────────────────────────────────────────────────────┘
```

**Two data paths:**
- **Raster:** COGs on R2 → STAC items in pgstac → titiler-pgstac renders tiles
- **Vector:** GeoJSON → PostGIS table → tipg serves vector tiles; STAC collection in pgstac provides metadata + `rel:external` link to tipg

---

## Prerequisites

```bash
# Tools
pip install pypgstac --break-system-packages
sudo apt install gdal-bin  # for ogr2ogr

# Connection (set from env, NEVER commit)
export DATABASE_URL="postgresql://neondb_owner:<password>@ep-holy-recipe-alf53rxj.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

---

## Loading Raster Data

### 1. Prepare COGs

Each raster layer needs Cloud-Optimized GeoTIFFs in EPSG:4326.

```bash
# Convert to COG (if not already)
gdal_translate input.tif output.tif \
  -of COG \
  -co COMPRESS=DEFLATE \
  -co PREDICTOR=2 \
  -a_srs EPSG:4326
```

### 2. Upload to R2

```bash
# Upload to Cloudflare R2 via rclone or wrangler
rclone copy output.tif r2:cheias-pt-data/precipitation/ --progress
# Available at: https://data.cheias.pt/precipitation/output.tif
```

### 3. Create STAC Collection

```json
{
  "type": "Collection",
  "id": "precipitation-daily",
  "stac_version": "1.0.0",
  "title": "Daily Precipitation",
  "description": "Daily accumulated rainfall from ERA5",
  "license": "various",
  "extent": {
    "spatial": { "bbox": [[-9.6, 36.9, -6.1, 42.2]] },
    "temporal": { "interval": [["2025-12-01T00:00:00Z", "2026-02-15T00:00:00Z"]] }
  },
  "links": []
}
```

```bash
pypgstac load collections collection.json --dsn "$DATABASE_URL" --method upsert
```

### 4. Create STAC Items (one per COG)

Items are NDJSON (one JSON object per line):

```json
{"type":"Feature","stac_version":"1.0.0","id":"precipitation-daily-2026-01-28","collection":"precipitation-daily","geometry":{"type":"Polygon","coordinates":[[[-9.6,36.9],[-6.1,36.9],[-6.1,42.2],[-9.6,42.2],[-9.6,36.9]]]},"bbox":[-9.6,36.9,-6.1,42.2],"properties":{"datetime":"2026-01-28T00:00:00Z"},"assets":{"data":{"href":"https://data.cheias.pt/precipitation/2026-01-28.tif","type":"image/tiff; application=geotiff; profile=cloud-optimized"}},"links":[]}
```

```bash
pypgstac load items items.ndjson --dsn "$DATABASE_URL" --method upsert
```

### 5. Create Dataset MDX (VEDA-UI)

`datasets/precipitation.data.mdx`:
```yaml
---
id: precipitation-daily
name: 'Daily Precipitation'
layers:
  - id: precipitation-daily
    stacCol: precipitation-daily
    name: Daily Precipitation
    type: raster
    sourceParams:
      assets: data
      colormap_name: blues
      nodata: nan
      return_mask: true
      resampling: bilinear
      bidx: 1
      rescale:
        - 0
        - 80
    legend:
      type: gradient
      min: '0 mm'
      max: '80 mm'
      stops: ['#f7fbff','#deebf7','#9ecae1','#3182bd','#08306b']
---
```

**Key raster sourceParams:**
- `nodata`: Must match the COG's actual NoData value (check with `gdalinfo`)
- `return_mask: true`: Makes nodata pixels transparent
- `colormap_name`: Any [rio-tiler colormap](https://cogeotiff.github.io/rio-tiler/colormap/)
- `rescale`: [min, max] for color mapping

---

## Loading Vector Data

Vector data follows a different path: GeoJSON → PostGIS → tipg → VEDA-UI.

### 1. Load GeoJSON into PostGIS

```bash
ogr2ogr -f PostgreSQL "PG:$DATABASE_URL" \
  flood-extent.geojson \
  -nln flood_extent_emsr864 \
  -overwrite \
  -lco GEOMETRY_NAME=geom \
  -t_srs EPSG:4326 \
  -progress
```

### 2. Add a `datetime` column (REQUIRED for VEDA-UI)

**VEDA-UI's VectorTimeseries component ALWAYS filters tiles by datetime.**
Without a `datetime` column, tipg returns empty tiles.

```sql
ALTER TABLE public.flood_extent_emsr864
ADD COLUMN IF NOT EXISTS datetime timestamptz
DEFAULT '2026-02-08T00:00:00Z';
```

For tables with actual per-feature dates, populate from the source column:
```sql
UPDATE public.flood_extent_emsr864
SET datetime = source_date::timestamptz
WHERE source_date IS NOT NULL AND source_date != '';
```

### 3. Verify tipg sees the table

tipg discovers tables at startup. **After adding columns, restart the eoAPI service** (redeploy on Sliplane).

```bash
# Check tipg collections
curl -s "https://api.cheias.pt/vector/collections" | python3 -c "
import json, sys
for c in json.load(sys.stdin)['collections']:
    print(c['id'])"

# Check temporal extent (confirms datetime column detected)
curl -s "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864" | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['extent']['temporal'])"

# Test vector tiles
curl -s -o /dev/null -w "size: %{size_download}" \
  "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864/tiles/WebMercatorQuad/8/121/97"
```

### 4. Create STAC Collection with `rel:external` link

**The STAC collection is metadata-only** — it tells VEDA-UI where the vector tiles are.
The `rel:external` link is how VEDA-UI discovers the tipg endpoint.

```json
{
  "type": "Collection",
  "id": "flood-extent-emsr864",
  "stac_version": "1.0.0",
  "title": "EMSR864 Flood Extent (Feb 2026)",
  "description": "Copernicus EMS flood delineation polygons",
  "license": "proprietary",
  "extent": {
    "spatial": { "bbox": [[-9.36, 37.0, -6.19, 42.15]] },
    "temporal": { "interval": [["2026-02-03T00:00:00Z", "2026-02-21T00:00:00Z"]] }
  },
  "links": [
    {
      "rel": "external",
      "href": "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864",
      "type": "application/json",
      "title": "OGC Features API (tipg)"
    }
  ]
}
```

```bash
pypgstac load collections collection.json --dsn "$DATABASE_URL" --method upsert
```

### 5. Create a STAC Item (REQUIRED for VEDA-UI timeline)

Even though vector data isn't per-item, VEDA-UI needs at least one item
to build its timeline/date selector.

```bash
python3 -c "
import json
item = {
    'type': 'Feature',
    'stac_version': '1.0.0',
    'id': 'flood-extent-emsr864-2026-02-08',
    'collection': 'flood-extent-emsr864',
    'geometry': {'type': 'Polygon', 'coordinates': [[[-9.5,37],[-6,37],[-6,42.2],[-9.5,42.2],[-9.5,37]]]},
    'bbox': [-9.5, 37, -6, 42.2],
    'properties': {'datetime': '2026-02-08T00:00:00Z'},
    'assets': {},
    'links': []
}
print(json.dumps(item))
" > /tmp/item.ndjson

pypgstac load items /tmp/item.ndjson --dsn "$DATABASE_URL" --method upsert
```

**The item datetime MUST match the PostGIS `datetime` column value.**
If tipg filters `WHERE datetime BETWEEN start AND end` and the values don't match,
tiles come back empty.

### 6. Create Dataset MDX (VEDA-UI)

`datasets/flood-extent.data.mdx`:
```yaml
---
id: flood-extent-emsr864
name: 'Flood Extent (CEMS Rapid Mapping)'
layers:
  - id: flood-extent-emsr864
    stacCol: flood-extent-emsr864
    name: Combined EMSR864 Flood Extent
    type: vector
    description: '14,747 flood delineation polygons'
    initialDatetime: newest
    zoomExtent:
      - 6
      - 20
    legend:
      type: categorical
      stops:
        - color: '#2471a3'
          label: 'Observed Flood Extent'
---
```

**Vector dataset MDX notes:**
- `type: vector` — triggers VectorTimeseries component
- `name` is a UI display label — do NOT set it to `default`. The docs say
  vector tiles must have a source-layer named `default` inside the MVT/PBF
  (tipg does this automatically). The `name` field is what shows in the legend.
- NO `sourceParams` — that's a raster concept; vector styling is hardcoded in VEDA-UI
- **Style is NOT customizable** (per docs). All vector polygons render with
  `theme.color.infographicB` (`#6138BE` purple) fill and `theme.color.danger`
  (`#FC3D21` red) line. Set legend colors to `#6138BE` to match reality.
- `stacCol` must match the STAC collection id
- `zoomExtent` controls min/max zoom for tile requests

### 7. nginx: WebMercatorQuad rewrite (REQUIRED)

VEDA-UI requests vector tiles as `/tiles/{z}/{x}/{y}` but tipg (OGC Tiles spec)
requires `/tiles/WebMercatorQuad/{z}/{x}/{y}`. Add this to `nginx.conf`:

```nginx
# Before the general /vector/ location block:
location ~ ^/vector/(collections/[^/]+/tiles)/(\d+)/(\d+)/(\d+)$ {
    rewrite ^/vector/(collections/[^/]+/tiles)/(\d+)/(\d+)/(\d+)$ /$1/WebMercatorQuad/$2/$3/$4 break;
    proxy_pass http://127.0.0.1:8083;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

---

## Verification Checklist

### Raster layer
```bash
# 1. COG accessible
curl -s -o /dev/null -w "%{http_code}" "https://data.cheias.pt/layer/date.tif"

# 2. STAC collection exists
curl -s "https://api.cheias.pt/collections/{id}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])"

# 3. STAC items exist
curl -s "https://api.cheias.pt/collections/{id}/items?limit=1" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['features']))"

# 4. Tiles render
curl -s -o /dev/null -w "size: %{size_download}" \
  "https://api.cheias.pt/raster/searches/{search_id}/tiles/WebMercatorQuad/7/61/48@1x?assets=data"
```

### Vector layer
```bash
# 1. PostGIS table has datetime column
psql "$DATABASE_URL" -c "\d public.flood_extent_emsr864" | grep datetime

# 2. tipg sees temporal extent
curl -s "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864" | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['extent']['temporal'])"

# 3. STAC collection has rel:external link
curl -s "https://api.cheias.pt/collections/flood-extent-emsr864" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print([l for l in d['links'] if l['rel']=='external'])"

# 4. STAC item exists with matching datetime
curl -s "https://api.cheias.pt/collections/flood-extent-emsr864/items?limit=1" | \
  python3 -c "import json,sys; f=json.load(sys.stdin)['features'][0]; print(f['properties']['datetime'])"

# 5. Tiles work WITH datetime filter
curl -s -o /dev/null -w "size: %{size_download}" \
  "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864/tiles/WebMercatorQuad/8/121/97?datetime=2026-02-08T00:00:00Z/2026-02-08T23:59:59Z"

# 6. Tiles work WITHOUT WebMercatorQuad (via nginx rewrite)
curl -s -o /dev/null -w "size: %{size_download}" \
  "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864/tiles/8/121/97?datetime=2026-02-08T00:00:00Z/2026-02-08T23:59:59Z"
```

---

## Current State (2026-03-20)

### STAC Collections (11)
| Collection | Type | Items | Status |
|---|---|---|---|
| flood-extent-emsr864 | vector | 1 | ✅ |
| flood-extent-emsr861 | vector | 1 | ✅ |
| soil-moisture-daily | raster | 77 | ✅ |
| precipitation-daily | raster | ~50 | ✅ |
| precondition | raster | 50 | ✅ |
| sst-anomaly | raster | ~60 | ✅ |
| ivt | raster | ~50 | ✅ |
| mslp | raster | ~50 | ✅ |
| wind-u | raster | ~50 | ✅ |
| wind-v | raster | ~50 | ✅ |
| satellite-ir | raster | ~10 | ✅ |

### PostGIS Vector Tables
| Table | Features | datetime column | tipg |
|---|---|---|---|
| flood_extent_emsr864 | 14,747 | `2026-02-08 00:00:00+00` | ✅ |
| flood_extent_emsr861 | 506 | `2026-01-30 00:00:00+00` | ✅ |
| rivers_portugal | 264 | — | ✅ (no VEDA-UI layer) |
| discharge_stations | 11 | — | ✅ (no VEDA-UI layer) |
| consequence_events | 42 | — | ✅ (no VEDA-UI layer) |
| storm_tracks | 3 | — | ✅ (no VEDA-UI layer) |
