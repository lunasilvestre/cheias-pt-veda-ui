# cheias.pt Story Refactors v2 — Post-Review Fixes

## Context

The restructured story is live at localhost:9000. Six issues from visual QA.
This prompt is designed for Claude Code on atlas with full filesystem + network access.

**Repos:**
- `~/Documents/dev/cheias-pt-veda-ui` — VEDA-UI instance (story, datasets, config)
- `~/Documents/dev/cheias-pt` — source data (GeoJSON, TIFs, CSVs)
- `~/Documents/dev/cheias-pt-stac` — STAC catalog + eoAPI deployment config

**Live eoAPI stack at `api.cheias.pt`:**
- STAC: `https://api.cheias.pt/` (stac-fastapi-pgstac)
- Raster: `https://api.cheias.pt/raster/` (titiler-pgstac)
- Vector: `https://api.cheias.pt/vector/` (tipg → PostGIS on Neon)
- `.env` in cheias-pt-veda-ui already points at these endpoints

**PostGIS collections already in Neon (via tipg):**
```
public.flood_extent_emsr861  — 506 features (Coimbra region, EMSR861)
public.consequence_events    — 42 features
public.discharge_stations    — gauge stations
public.rivers_portugal       — river network
public.storm_tracks          — storm trajectories
```

**NOT yet in PostGIS:**
```
~/Documents/dev/cheias-pt/data/flood-extent/emsr864.geojson — 14,747 features, 125MB
  13 AOIs: Salvaterra (4234), Aveiro (3106), Coimbra (1937), Ponte de Lima (1266), etc.
```

---

## Issue 1: Soil Moisture Legend Doesn't Match Viridis Colormap

The dataset uses `colormap_name: viridis` in `sourceParams` but the legend `stops` use
brown/blue colors that don't match. The map renders viridis but the legend shows something else.

**File:** `datasets/soil-moisture.data.mdx`

**Fix:** Replace the `legend.stops` array with actual viridis hex values:
```yaml
    legend:
      type: gradient
      min: 'Dry (0.05)'
      max: 'Saturated (0.50)'
      stops:
        - '#440154'
        - '#31688e'
        - '#21918c'
        - '#5ec962'
        - '#fde725'
```

**Verify:** Rebuild, compare legend gradient to the map tile colors visually.

---

## Issue 2: Compare Maps Not Rendering Second Layer

The `<Map compareDateTime=...>` blocks show only one layer — no split-screen slider.

**Root cause:** VEDA-UI's `useMapLayers()` in
`.veda/ui/packages/veda-ui/src/components/common/blocks/lazy-components.jsx` (line ~70)
checks `baseMapStaticData.data.compare` for a `layerId`. Without a `compare` block in the
dataset layer config, `compareDataLayer` resolves to null and the `<Compare>` component
in `block-map.tsx` (line ~340) never renders.

**Reference:** See `.veda/ui/mock/datasets/no2.data.mdx` — search for `compare:` blocks.

**Fix:** Add `compare` sections to both dataset MDX files used in compare maps.

In `datasets/soil-moisture.data.mdx`, add after `sourceParams`, before `legend`:
```yaml
    compare:
      datasetId: soil-moisture-daily
      layerId: soil-moisture-daily
      mapLabel: |
        ::js ({ dateFns, datetime, compareDatetime }) => {
          if (!datetime || !compareDatetime) return '';
          return `${dateFns.format(datetime, 'MMM d, yyyy')} vs ${dateFns.format(compareDatetime, 'MMM d, yyyy')}`;
        }
```

In `datasets/precipitation.data.mdx`, same pattern:
```yaml
    compare:
      datasetId: precipitation-daily
      layerId: precipitation-daily
      mapLabel: |
        ::js ({ dateFns, datetime, compareDatetime }) => {
          if (!datetime || !compareDatetime) return '';
          return `${dateFns.format(datetime, 'MMM d, yyyy')} vs ${dateFns.format(compareDatetime, 'MMM d, yyyy')}`;
        }
```

**Verify:** Rebuild. Both compare maps should show a draggable split-screen slider.
The soil moisture map label should read "Feb 8, 2026 vs Dec 15, 2025".
The precipitation map label should read "Feb 6, 2026 vs Jan 28, 2026".

---

## Issue 3: Discharge Chart Tooltip Has No Storm Context

The Chart tooltip shows "Tejo - Vila Franca de Xira: 6775" — no indication which storm
is active. The VEDA-UI Chart component uses the `idKey` column value as the series label
in tooltips (see `.veda/ui/packages/veda-ui/src/components/common/chart/tooltip.tsx`).

**Fix:** Rewrite `stories/media/floods/discharge-timeseries.csv` with storm phase as `idKey`:

```csv
Date,Phase,Discharge_m3s
2025-12-01,Baseline,450
2025-12-08,Baseline,520
2025-12-15,Baseline,680
2025-12-22,Baseline,890
2025-12-29,Baseline,1150
2026-01-05,Baseline,980
2026-01-12,Baseline,1240
2026-01-19,Baseline,1380
2026-01-26,Pre-storm,1520
2026-01-28,Kristin,2180
2026-01-29,Kristin,3100
2026-01-30,Kristin (peak),3706
2026-01-31,Post-Kristin,3200
2026-02-01,Post-Kristin,2850
2026-02-02,Post-Kristin,2500
2026-02-03,Leonardo,2680
2026-02-04,Leonardo,3100
2026-02-05,Leonardo,4200
2026-02-06,Leonardo,5400
2026-02-07,Leonardo (peak),6775
2026-02-08,Marta,6200
2026-02-09,Marta,5100
2026-02-10,Recovery,4300
2026-02-11,Recovery,3600
2026-02-12,Recovery,3100
2026-02-14,Recovery,2600
2026-02-16,Recovery,2200
2026-02-18,Recovery,1900
2026-02-21,Recovery,1498
```

Then update the Chart block in the story MDX:
```jsx
<Chart
  dataPath={new URL('./media/floods/discharge-timeseries.csv', import.meta.url).href}
  idKey='Phase'
  xKey='Date'
  yKey='Discharge_m3s'
  ...
```

NOTE: Multiple `idKey` values means multiple line series in different colors. This is
actually good — each storm phase gets its own color. Set enough colors:
```jsx
colors={['#888888', '#aaaaaa', '#e6550d', '#fd8d3c', '#fdae6b', '#3182bd', '#6baed6', '#d62728', '#2ca02c']}
```
(9 colors for: Baseline, Pre-storm, Kristin, Kristin peak, Post-Kristin, Leonardo, Leonardo peak, Marta, Recovery)

If the multi-series look is too cluttered after testing, fall back to original single-series
and accept the simpler tooltip. The highlight band already communicates storm timing.

---

## Issue 4: Sentinel-2 CompareImage — DROP IT

The Sentinel-2 GeoTIFFs cover a narrow swath (27% of frame is valid data, rest is nodata).
Even cropped, the images are ~50% nodata diagonally — typical Sentinel-2 granule boundary.
No clear before/after flood contrast visible in the true-color composite.

**Decision: Remove the CompareImage block entirely from the story.**

In `stories/winter-2025-26-floods.stories.mdx`, delete the entire "Satellite Evidence"
section — both the CompareImage block AND the GPM image block below it.

Move the GPM image to the "Climate Fingerprint" section (after the discharge comparison image):

```jsx
<Block type='wide'>
  <Figure>
    <Image
      src={new URL('./media/floods/gpm-precipitation-iberia-feb01-07.jpg', import.meta.url).href}
      alt='NASA GPM IMERG accumulated precipitation over Iberia, February 1–7, 2026'
    />
    <Caption
      attrAuthor='NASA GPM / IMERG'
      attrUrl='https://gpm.nasa.gov/'
    >
      NASA GPM captured accumulated precipitation across Iberia during Storm Leonardo (Feb 1–7).
      The concentration over central Portugal explains the record discharge at Vila Franca de Xira.
    </Caption>
  </Figure>
</Block>
```

Delete the `## Satellite Evidence` heading and its blocks. Remove the now-unused JPEG files:
```bash
rm stories/media/floods/salvaterra-before-20260106.jpg
rm stories/media/floods/salvaterra-after-20260220.jpg
```

---

## Issue 5: Peak Flood Extent — Vector Layers on Satellite + Terrain

This is the flagship closing visual. The current story uses a raster soil moisture proxy.
Replace it with actual EMSR864 flood polygons served as vector tiles from eoAPI/tipg
over a satellite basemap with Mapbox terrain.

### 5A: Load EMSR864 into PostGIS on Neon

EMSR861 (506 features, Coimbra area) is already in PostGIS. EMSR864 (14,747 features,
national extent) is NOT. The GeoJSON is at:
`~/Documents/dev/cheias-pt/data/flood-extent/emsr864.geojson` (125MB, 13 AOIs)

**Neon DATABASE_URL:**
```bash
export DATABASE_URL="$DATABASE_URL (set from env — never commit credentials)"
```

Load EMSR864:
```bash
# Load EMSR864 into PostGIS
ogr2ogr -f PostgreSQL "PG:$DATABASE_URL" \
  ~/Documents/dev/cheias-pt/data/flood-extent/emsr864.geojson \
  -nln flood_extent_emsr864 \
  -overwrite \
  -lco GEOMETRY_NAME=geom \
  -t_srs EPSG:4326 \
  -progress
```

Verify it's accessible via tipg:
```bash
curl -s "https://api.cheias.pt/vector/collections" | python3 -c "
import json, sys
for c in json.load(sys.stdin)['collections']:
    if 'flood' in c['id'].lower() or 'emsr' in c['id'].lower():
        print(f'{c[\"id\"]}: {c.get(\"title\",\"\")}')
"

# Test vector tile at zoom 8 (should return >0 bytes)
curl -s -o /dev/null -w "size: %{size_download}" \
  "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864/tiles/WebMercatorQuad/8/121/97"
```

### 5B: Create STAC Collection with External Link to TiPg

VEDA-UI's vector layer system (`VectorTimeseries` component in
`.veda/ui/packages/veda-ui/src/components/common/map/style-generators/vector-timeseries.tsx`)
discovers the tile endpoint by:
1. Fetching `{STAC_ENDPOINT}/collections/{stacCol}`
2. Finding the link with `rel=external`
3. Using that href as the base for `{href}/tiles/{z}/{x}/{y}`

So we need a STAC collection in pgstac that has an `external` link pointing to the
tipg collection endpoint.

Create `~/Documents/dev/cheias-pt-stac/data/flood-extent-emsr864.json`:
```json
{
  "type": "Collection",
  "id": "flood-extent-emsr864",
  "stac_version": "1.0.0",
  "title": "EMSR864 Flood Extent (Feb 2026)",
  "description": "Copernicus EMS flood delineation polygons — 14,747 features across 13 AOIs",
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

Load into pgstac:
```bash
pypgstac load collections \
  ~/Documents/dev/cheias-pt-stac/data/flood-extent-emsr864.json \
  --dsn "$DATABASE_URL" \
  --method upsert
```

Verify the external link resolves:
```bash
curl -s "https://api.cheias.pt/collections/flood-extent-emsr864" | python3 -c "
import json, sys
d = json.load(sys.stdin)
ext = [l for l in d.get('links',[]) if l.get('rel') == 'external']
print(f'External links: {ext}')
"
```

### 5C: Create Dataset MDX for VEDA-UI

Update `datasets/flood-extent.data.mdx` — change `type: raster` to `type: vector`:

```yaml
---
id: flood-extent-emsr864
name: 'Flood Extent (CEMS Rapid Mapping)'
description: 'Observed flood polygons from Copernicus EMS activation EMSR864, Feb 2026.'
media:
  src: ::file media/flood-extent-cover.png
  alt: 'Flooded areas mapped by Copernicus EMS across Portugal'
  author:
    name: Copernicus EMS
    url: https://emergency.copernicus.eu/
taxonomy:
  - name: Topics
    values:
      - Flood Monitoring
      - Emergency Response
  - name: Source
    values:
      - Sentinel-1 SAR

layers:
  - id: flood-extent-emsr864
    stacCol: flood-extent-emsr864
    name: EMSR864 Flood Extent
    type: vector
    description: '14,747 flood delineation polygons across 13 areas of interest.'
    initialDatetime: newest
    zoomExtent:
      - 6
      - 20
    sourceParams:
      assets: default
    legend:
      type: categorical
      stops:
        - color: '#2471a3'
          label: 'Observed Flood Extent'
    metadata:
      source: Copernicus EMS / Sentinel-1 SAR
---

<Block>
<Prose>
## Rapid Flood Mapping

The Copernicus Emergency Management Service (EMSR864) mapped 226,764 hectares of
inundation across 13 Portuguese areas of interest using Sentinel-1 SAR imagery.
</Prose>
</Block>
```

IMPORTANT: The `VectorTimeseries` component (line ~140 of vector-timeseries.tsx) renders
polygons with `fill-color: theme.color.infographicB` and lines with `theme.color.danger-300`.
This is the default VEDA-UI vector style — not customizable via MDX without a patch.
It should render as colored polygon fills over the basemap, which is fine for v0.

### 5D: Update Story MDX — Flood Extent Block

Replace the Peak Flood Extent section in the story. Use `basemapId='satellite'` for
the satellite terrain feel:

```jsx
## Peak Flood Extent

<Block type='full'>
  <Figure>
    <Map
      datasetId='flood-extent-emsr864'
      layerId='flood-extent-emsr864'
      dateTime='2026-02-08'
      zoom={8}
      center={[-8.9, 39.0]}
      basemapId='satellite'
    />
    <Caption
      attrAuthor='Copernicus EMS (EMSR864)'
      attrUrl='https://mapping.emergency.copernicus.eu/activations/EMSR864/'
    >
      February 2026: 226,764 hectares of observed inundation across Portugal.
      14,747 flood polygons delineated from Sentinel-1 SAR by Copernicus Emergency
      Management Service. Zoom in to explore individual AOIs — Salvaterra de Magos
      (49,164 ha), Coimbra, Aveiro, Alcácer do Sal.
    </Caption>
  </Figure>
</Block>
```

### 5E: 3D Terrain via Mapbox Style

Mapbox GL JS supports terrain via the style spec. VEDA-UI doesn't expose a terrain prop,
but the `mapOptions.style` can include terrain configuration.

**Option A — Custom Mapbox Style (recommended for v0):**

1. Go to Mapbox Studio (https://studio.mapbox.com/)
2. Duplicate the satellite style used by VEDA-UI (or `mapbox://styles/mapbox/satellite-v9`)
3. In the style editor, add terrain:
   - Style → Terrain → Enable → Source: Mapbox Terrain DEM v1 → Exaggeration: 1.5
4. Publish and copy the style URL (e.g. `mapbox://styles/lunasilvestre/cm...`)
5. In `.env`, set `MAPBOX_STYLE_URL` to the new style with terrain
   OR add the style to the basemap options

**Limitation:** The terrain applies to ALL maps in the story if set via MAPBOX_STYLE_URL.
If that's acceptable for v0, it gives every map a 3D terrain feel. If not, this is post-v0.

**Option B — Programmatic terrain (requires VEDA-UI patch, post-v0):**

In `.veda/ui/packages/veda-ui/src/components/common/blocks/block-map.tsx`, after the
Map component initializes, add:
```tsx
mapInstance.on('load', () => {
  mapInstance.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    tileSize: 512,
    maxzoom: 14
  });
  mapInstance.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
});
```
This is a submodule patch — defer to post-v0 unless Nelson says to do it.

**For v0:** Use Option A if quick (10 min in Mapbox Studio). Otherwise ship with
`basemapId='satellite'` (flat satellite, no terrain) and the vector flood polygons.
The vector overlay on satellite is already a massive upgrade over the raster proxy.

---

## Execution Order

1. **Issue 1** — Legend fix (30 seconds, one file edit)
2. **Issue 2** — Compare config (2 minutes, two file edits)
3. **Issue 3** — Chart CSV + MDX update (2 minutes)
4. **Issue 4** — Drop CompareImage, move GPM image (2 minutes)
5. **Issue 5A** — Load EMSR864 into PostGIS (DATABASE_URL provided above, 5 minutes)
6. **Issue 5B** — Create STAC collection with external link (2 minutes)
7. **Issue 5C** — Update flood-extent dataset MDX to type:vector (2 minutes)
8. **Issue 5D** — Update story MDX flood extent block (1 minute)
9. **Issue 5E** — Terrain style (optional, 10 minutes if doing Mapbox Studio)
10. **Rebuild and test** — `rm -rf .parcel-cache && yarn --ignore-engines clean && yarn --ignore-engines serve`

## Build & Test

```bash
cd ~/Documents/dev/cheias-pt-veda-ui
rm -rf .parcel-cache && yarn --ignore-engines clean && yarn --ignore-engines serve
# Visit http://localhost:9000/stories/winter-2025-26-floods
```

**Test checklist:**
- [ ] Soil moisture legend gradient matches map tile colors
- [ ] Soil moisture compare shows split-screen slider with both dates
- [ ] Precipitation compare shows split-screen slider with both dates
- [ ] Discharge chart tooltip shows storm phase name on hover
- [ ] CompareImage section is gone, GPM image moved to Climate Fingerprint
- [ ] Peak Flood Extent shows blue/colored vector polygons on satellite basemap
- [ ] Vector polygons visible at zoom 8, detail increases on zoom in
- [ ] No console errors related to STAC fetch or vector tile loading

## Commit

```bash
cd ~/Documents/dev/cheias-pt-veda-ui
git add stories/ datasets/ .env
git commit -m "fix: compare maps, vector flood extent, legend, chart tooltips

- Add compare config to soil-moisture and precipitation layers (enables split-screen)
- Fix soil moisture legend stops to match viridis colormap
- Update discharge CSV with storm phase labels for informative tooltips
- Drop Sentinel-2 CompareImage (insufficient coverage), relocate GPM image
- Switch flood extent from raster proxy to vector tiles via eoAPI/tipg
- Use satellite basemap for flood extent map"
git push origin main
```

Also commit the STAC collection:
```bash
cd ~/Documents/dev/cheias-pt-stac
git add data/flood-extent-emsr864.json
git commit -m "feat: add EMSR864 flood extent STAC collection with tipg external link"
git push origin main
```
