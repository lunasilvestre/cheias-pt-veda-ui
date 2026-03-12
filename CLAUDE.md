# cheias.pt — VEDA Dashboard Story Implementation

## Mission

Build a comprehensive scrollytelling data story about the Winter 2025-26 Portuguese flood crisis using the VEDA Dashboard platform. The story must use the **actual source data, notebooks, and design documents** from the `cheias-pt` research repository — not invented content.

## Architecture

```
cheias-pt-veda-ui/          ← THIS REPO: VEDA Dashboard instance (Parcel + React + MapboxGL)
  .veda/ui/                 ← git submodule: veda-ui v6.20.6
  datasets/*.data.mdx       ← Dataset definitions (YAML frontmatter + prose)
  stories/*.stories.mdx     ← Story files (MDX with ScrollytellingBlock, Chart, etc.)
  veda.config.js            ← Navigation, glob patterns
  .env / .env.local         ← Endpoints, Mapbox token

~/Documents/dev/cheias-pt/  ← RESEARCH REPO: data, notebooks, design docs, scripts
  tasks/cheias-extended-story.mdx  ← THE AUTHORITATIVE STORY TEXT (10 chapters, ~750 lines)
  data/                     ← Processed datasets (see inventory below)
  notebooks/                ← Analysis notebooks with publication-quality figures
  scripts/                  ← Data fetching and processing scripts
  assets/                   ← GeoJSON boundaries (basins.geojson, districts, rivers)
```

## Critical Context

### The Story MDX (`tasks/cheias-extended-story.mdx`)

This is the **authoritative narrative**. It has 10 chapters plus epilogue:

1. **The Atlantic Engine Warms** — SST anomaly + soil moisture + atmospheric river (3 ScrollytellingBlock chapters)
2. **Storm Kristin — The Record-Breaking Wind** — Precipitation, discharge peaks (4 ScrollytellingBlock chapters + discharge Chart)
3. **Human Cost of Kristin** — Deaths, infrastructure damage (prose + storm comparison Table)
4. **Storm Leonardo — The Persistent Rainfall** — Accumulated precip, Tejo at 6,775 m³/s, flood extent, evacuations (4 ScrollytellingBlock chapters)
5. **The Breaking Point — A1 Motorway Collapse** — Infrastructure failure (Image + prose)
6. **Storm Marta — The Final Blow** — Sustained crisis (prose + fatality timeline Chart)
7. **Peak Flood Extent — The Satellite View** — EMSR864 mapping, Salvaterra, Mondego, cascading basins (4 ScrollytellingBlock chapters + full-width Map)
8. **The Climate Change Fingerprint** — WW Attribution study, Coimbra record, projections (prose + rainfall anomaly Chart)
9. **Recovery and Reconstruction** — Receding waters, government response (3 ScrollytellingBlock chapters)
10. **What cheias.pt Does** — Platform purpose, Copernicus EMS embed

The story references these CSV data files:
- `./data/discharge-timeseries.csv` — Tejo discharge (29 rows, Dec 2025–Feb 2026)
- `./data/fatality-timeline.csv` — Cumulative deaths across 3 storms (9 rows)
- `./data/storm-comparison.csv` — Wind, deaths, evacuations per storm
- `./data/rainfall-anomaly.csv` — January 2026 vs historical

### COGs on Cloudflare R2

**Base URL:** `https://pub-abad2527698d4bbab82318691c9b07a1.r2.dev/cog/`

Confirmed available subdirectories (daily files as `YYYY-MM-DD.tif`):
- `precipitation/` — ERA5 daily rainfall (mm/day), range 0–110, bounds [-9.6, 36.9, -6.1, 42.2]
- `soil-moisture/` — ERA5-Land 0-28cm (m³/m³), range 0–0.53
- `sst/` — NOAA OISST anomaly (°C), range -8.7 to +9.3, North Atlantic extent
- `ivt/` — Atmospheric river proxy (kg/m/s), range 0–772, North Atlantic extent
- `precondition/` — Compound flood risk index, range 0–113

Date coverage: Dec 1, 2025 → Feb 10-15, 2026 (varies by dataset).

**TiTiler:** `https://titiler.cheias.pt`
- Tile endpoint: `/cog/WebMercatorQuad/tilejson.json?url=<COG_URL>&colormap_name=<cmap>&rescale=<min>,<max>`
- Tile template: `/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=<COG_URL>&...`
- Info: `/cog/info?url=<COG_URL>`
- Stats: `/cog/statistics?url=<COG_URL>`

### STAC Catalog (NEEDED)

VEDA's `type: raster` layers resolve through STAC → TiTiler mosaic pipeline:
1. Layer defines `stacCol` → VEDA searches STAC API for features matching date
2. STAC returns COG asset URLs → VEDA registers mosaic with TiTiler
3. TiTiler serves tiles from the mosaic

**There is no STAC catalog yet.** The `.env` currently points to `https://openveda.cloud/api/stac` (NASA's public STAC) as fallback, which doesn't have our collections. This means scrollytelling map layers show "problem loading map data" errors.

**To fix this**, we need a static STAC catalog (or stac-fastapi) with collections for each dataset, each containing Items that reference the R2 COG URLs. Per-layer `stacApiEndpoint` in the dataset MDX can override the default.

### Colormaps (from `data/colormaps/palette.json`)

| Layer | Type | Domain | Colors |
|-------|------|--------|--------|
| precipitation-blues | sequential | 0–80 mm/day | #e8f4f8 → #08519c |
| soil-moisture-browns | sequential | 0.1–0.5 m³/m³ | #f5e6c8 → #0a2840 |
| sst-diverging | diverging | -2 to +2 °C | #2166ac → #f7f7f7 → #b2182b |
| ivt-sequential | sequential | 0–800 kg/m/s | transparent → #4a1486 → #ffffff |
| flood-extent | categorical | — | #2471a3 fill, #1a5276 stroke |
| precondition | see design-vision.md | 0–1 | #2166ac → #f7f7f7 → #b2182b |

### Flood Extent Data (`data/flood-extent/`)

- `emsr861.geojson` — Storm Kristin, 506 polygons, 7,723 ha (Coimbra)
- `emsr864.geojson` — Storm Leonardo/Marta, 14,747 polygons, 219,041 ha (13 AOIs)
- `combined.geojson` — 15,253 polygons, 226,764 ha total
- `combined.pmtiles` — 17 MB, z4-z14, for MapLibre vector source
- `salvaterra_temporal.pmtiles` — 6.4 MB, 3-date animation (Feb 6/7/8)

### Notebook Figures (`notebooks/figures/`)

Publication-quality charts on dark backgrounds (#1a1a2e):
- `discharge_tejo.png` — Tejo hydrograph with climatological context, storm markers, peak annotation
- `discharge_comparison.png` — 8-river multi-panel amplification chart
- `discharge_{mondego,sado,douro,guadiana,vouga,lis,minho}.png` — Per-river
- `soil-moisture-4dates.png` — 4-panel spatial progression (Dec 1 → Feb 5)
- `soil-moisture-basin-timeseries.png` — Tejo/Mondego/Sado/Douro time series
- `soil-moisture-filmstrip.png` — Full temporal filmstrip
- `05-precip-accumulation-maps.png` — Storm window vs full period spatial
- `05-precip-basin-timeseries.png` — Top 6 basins daily+cumulative
- `05-precip-timeseries-locations.png` — 4 representative locations
- `precipitation-filmstrip.png` — Full temporal filmstrip

### Design Vision (`data/design-vision.md`)

Key principles from the design document:
- **Not a dashboard — a scroll-driven geo-narrative**
- **Three-act structure:** Hook (Ch.1) → Evidence (Ch.2-7) → Resolution (Ch.8-9)
- **Physical metaphor:** Scroll = descending into water
- **Emotional sequence:** Delight → Curiosity → Exploration → Digestion
- **Basemap moods:** 6 moods from ultra-dark (#060e14) to satellite imagery
- **Typography:** Georgia serif for titles, Inter sans-serif for body
- **Glassmorphism panels:** rgba(9,20,26,0.4) + backdrop-filter: blur(16px)

## VEDA Component Reference

Available MDX components (from `.veda/ui/packages/veda-ui/src/libs/mdx-components.ts`):

```
Block, MapBlock, MultilayerMapBlock, Chart, Table, Embed, Image, CompareImage,
Figure, ScrollytellingBlock, Prose, Chapter, Caption
```

### Chapter Props (scrollytelling)
```typescript
center: [number, number]     // [lon, lat]
zoom: number
datasetId: string            // references datasets/*.data.mdx id
layerId: string              // references layer id within dataset
datetime?: string            // 'YYYY-MM-DD'
showBaseMap?: boolean         // basemap only, no data layer
projectionId?: string
```

### Chart Props
```typescript
dataPath: string             // URL to CSV file
idKey: string                // column for series grouping
xKey: string                 // x-axis column
yKey: string                 // y-axis column
dateFormat?: string           // d3 date format ('%Y-%m-%d')
xAxisLabel?: string
yAxisLabel?: string
colors?: string[]
highlightStart?: string
highlightEnd?: string
highlightLabel?: string
altTitle?: string
altDesc?: string
```

### Dataset MDX Layer Config
```yaml
layers:
  - id: layer-id
    stacCol: stac-collection-name   # must exist in STAC catalog
    name: Display Name
    type: raster                    # raster|vector|zarr|cmr|wms|wmts
    stacApiEndpoint: https://...    # per-layer STAC override
    tileApiEndpoint: https://...    # per-layer TiTiler override
    sourceParams:
      colormap_name: blues
      rescale: [0, 80]
      bidx: 1
      nodata: 0
      resampling: bilinear
    legend:
      type: gradient
      min: '0'
      max: '80'
      stops: ['#fff', '#00f']
```

## Current State

### What exists and works
- Dev server runs at localhost:9000 (`node .veda/veda serve`)
- 5 placeholder dataset MDX files (precipitation, soil-moisture, sst-anomaly, discharge, flood-extent)
- 1 placeholder story MDX (not based on original source text)
- Mapbox basemap renders correctly (dark-v11)
- Chart components render from CSV data
- All navigation routes return 200

### What needs to be done
1. **Build a static STAC catalog** with collections for each COG dataset, pointing to R2 URLs
2. **Rewrite story MDX** to faithfully adapt `cheias-extended-story.mdx` for VEDA components
3. **Create proper CSV data files** from the notebook analysis outputs (`data/discharge/`, `data/precipitation/`, `data/soil-moisture/`)
4. **Embed notebook figures** as static images where they're more informative than TiTiler raster renders
5. **Create all referenced datasets** (ivt-atmospheric-rivers, wind-field-6h, etc.)
6. **Copy flood extent PMTiles** for potential vector layer integration

## Environment

- **Mapbox token:** in `.env.local` (gitignored)
- **Node:** v20 required (`.nvmrc`), use `--ignore-engines` if on v22
- **Yarn:** via corepack (`COREPACK_HOME=/home/nls/.corepack corepack enable --install-directory=/home/nls/.local/bin`)
- **Dev server:** `node .veda/veda serve` (Parcel, serves on :9000)
- **SASS warning:** sass binary not found during build — non-fatal, CSS still works

## Data Inventory To Audit

On this machine, run the following to see the full data inventory:

```bash
# COG inventory on R2 (check all dates)
for sub in precipitation soil-moisture sst ivt precondition; do
  echo "=== ${sub} ==="
  for d in $(seq -f "2025-12-%02g" 1 31) $(seq -f "2026-01-%02g" 1 31) $(seq -f "2026-02-%02g" 1 15); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "https://pub-abad2527698d4bbab82318691c9b07a1.r2.dev/cog/${sub}/${d}.tif")
    [ "$code" = "200" ] && echo "  ${d}.tif"
  done
done

# Local data sizes
du -sh ~/Documents/dev/cheias-pt/data/*/

# Parquet/JSON data files
find ~/Documents/dev/cheias-pt/data -name "*.parquet" -o -name "*.json" -o -name "*.csv" | xargs ls -lh

# GeoJSON/PMTiles
find ~/Documents/dev/cheias-pt/data -name "*.geojson" -o -name "*.pmtiles" | xargs ls -lh

# Notebook figures
ls -la ~/Documents/dev/cheias-pt/notebooks/figures/
```

## Key Files to Read First

1. `tasks/cheias-extended-story.mdx` — The narrative (you're adapting this)
2. `data/design-vision.md` — Visual identity and chapter storyboard
3. `data/colormaps/palette.json` — All 12 colormap definitions
4. `data/colormaps/COLORMAP-DECISIONS.md` — Rationale and composite tests
5. `data/temporal/README.md` — Dataset inventory with validation results
6. `data/flood-extent/README.md` — CEMS data with per-AOI breakdown
7. `data/basemap/BASEMAP-DECISIONS.md` — Per-chapter mood design
8. `notebooks/04-discharge-timeseries.py` — Discharge analysis (8 rivers)
9. `notebooks/05-precipitation-grid.py` — Precipitation validation
10. `notebooks/03-soil-moisture-grid.py` — Soil saturation analysis
