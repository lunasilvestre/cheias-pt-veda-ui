# cheias.pt — VEDA-UI Geo-Narrative Platform

## Mission

Portuguese flood geo-narrative about the Winter 2025-26 crisis, built on NASA/DevSeed's
VEDA-UI framework. Portfolio piece targeting Development Seed (Lisbon).

## Architecture (Production, 2026-03-19)

```
cheias-pt-veda-ui/          ← THIS REPO: VEDA Dashboard instance (Parcel + React + MapboxGL)
  .veda/ui/                 ← git submodule: veda-ui v6.20.6 (VANILLA — no patches)
  datasets/*.data.mdx       ← 8 dataset definitions (raster layers)
  stories/*.stories.mdx     ← 1 story (winter-2025-26-floods)
  overrides/                ← Custom branding (header-brand, page-footer, about, home)
  veda.config.js            ← Nav, page overrides, strings
  vercel.json               ← Build config + homepage redirect to story
  prompts/                  ← Claude Code prompts for story work
  .env / .env.local         ← Endpoints, Mapbox token

cheias-pt-eoapi/            ← Production Docker image (nginx + stac + titiler + tipg)
  GitHub: lunasilvestre/cheias-pt-eoapi

cheias-pt-stac/             ← STAC catalog builder + deployment prompts
  GitHub: lunasilvestre/cheias-pt-stac

cheias-pt/                  ← Research repo (data, notebooks, scripts, design docs)
  tasks/cheias-component-showcase.md  ← Component reference (all VEDA-UI components mapped)
  tasks/cheias-extended-story.mdx     ← Original 10-chapter narrative
  data/sentinel-2/                    ← Sentinel-2 before/after GeoTIFFs (for CompareImage)
```

### Production Services

| Service | URL | Stack | Host |
|---------|-----|-------|------|
| **eoAPI (unified)** | `api.cheias.pt` | stac-fastapi + titiler-pgstac + tipg + nginx | Sliplane |
| **Database** | Neon.tech (Frankfurt) | PostgreSQL + PostGIS + pgstac | Neon free tier |
| **COGs** | `data.cheias.pt` | Cloudflare R2 bucket | Cloudflare |
| **Frontend** | `cheias.pt` | VEDA-UI static site | Vercel (pending) |

REDACTED

### eoAPI Routing (nginx on Sliplane)

- `/` → stac-fastapi (:8081)
- `/raster/` → titiler-pgstac (:8082, `--root-path /raster`)
- `/vector/` → tipg (:8083, `--root-path /vector`)
- All services get `X-Forwarded-Proto: https` (Sliplane terminates SSL)

### Decommissioned

- `stac.cheias.pt` (rustac) — replaced by `api.cheias.pt`
- `titiler.cheias.pt` (standalone TiTiler) — replaced by `api.cheias.pt/raster`

## Data in Production

### STAC (9 collections, 1,684 items)

| Collection | Items | Colormap | Rescale |
|------------|-------|----------|---------|
| sst-anomaly | ~66 | rdbu_r | -3,3 |
| precipitation-daily | ~77 | blues | 0,80 |
| soil-moisture-daily | ~77 | viridis | 0.1,0.5 |
| ivt | ~77 | plasma | 0,500 |
| mslp | ~77 | rdbu | 990,1035 |
| precondition | ~77 | rdbu_r | 0,100 |
| wind-u | varies | coolwarm | -20,20 |
| wind-v | varies | coolwarm | -20,20 |
| satellite-ir | varies | gray_r | 200,300 |

### PostGIS Vector Tables (via tipg at `/vector/`)

| Table | Features | Source |
|-------|----------|--------|
| `public.flood_extent_emsr861` | 506 | EMSR861 Coimbra flood polygons |
| `public.consequence_events` | 42 | Geocoded consequence events |
| `public.rivers_portugal` | 264 | River network |
| `public.discharge_stations` | 11 | Gauge station locations |
| `public.storm_tracks` | 3 | Storm trajectories |
| `public.frontal_boundaries` | 4 | Frontal positions |

## Dataset MDX Files (8)

All raster datasets require `assets: data` in sourceParams (titiler-pgstac needs
explicit asset name, not VEDA-UI's default `cog_default`).

```
datasets/sst-anomaly.data.mdx
datasets/precipitation.data.mdx
datasets/soil-moisture.data.mdx
datasets/ivt.data.mdx
datasets/mslp.data.mdx
datasets/precondition.data.mdx
datasets/discharge.data.mdx         ← placeholder (no STAC collection yet)
datasets/flood-extent.data.mdx      ← placeholder (no STAC collection yet)
```

## Story Media (stories/media/floods/)

| File | Type | For |
|------|------|-----|
| hero-sentinel1-tejo.jpg | Hero image | Story cover |
| a1-collapse-coimbra.jpg | Photo | Infrastructure damage |
| discharge-comparison-story.png | Pre-rendered chart | 6 rivers |
| rainfall-anomaly.png | Pre-rendered chart | 26-year bar chart |
| gpm-precipitation-iberia-feb01-07.jpg | Satellite image | NASA GPM |
| discharge-timeseries.csv | Data | Chart component |
| fatality-timeline.csv | Data | Chart component |
| storm-comparison.csv | Data | Markdown table (NOT Table component) |
| rainfall-anomaly.csv | Data | Reference |

### Sentinel-2 Before/After (needs JPEG conversion)

Source GeoTIFFs at `~/Documents/dev/cheias-pt/data/sentinel-2/`:
- `salvaterra-before-20260106.tif` (31 MB) — pre-flood RGB
- `salvaterra-after-20260220.tif` (28 MB) — post-flood RGB
- `salvaterra-ndwi-before-20260106.tif` — NDWI index
- `salvaterra-ndwi-after-20260220.tif` — NDWI index

Convert to JPEG for CompareImage component (max 2000px wide, quality 85).

## Branding (via VEDA-UI PAGE_OVERRIDES — no submodule patching)

```
overrides/header-brand/index.mdx  ← Water-drop SVG logo + "cheias.pt BETA"
overrides/page-footer/index.mdx   ← "cheias.pt · Built on VEDA · Powered by eoAPI"
overrides/about.mdx                ← About page content
overrides/home.mdx                 ← Homepage (fallback, Vercel redirects / → story)
```

NASA template media (31 directories, ~230 MB) deleted. NASA logos removed.

## VEDA-UI Component Reference

Available in MDX stories (from `mdx-components.ts`):

```
Block, Prose, Figure, Caption, Image, CompareImage, Chart, Map,
ScrollytellingBlock, Chapter, Embed, MapBlock, MultilayerMapBlock
```

### CRITICAL CONSTRAINTS

1. **ONE ScrollytellingBlock per story** — upstream bug with scrollama global
   `[data-step]` selector causes crash on multiple blocks. Known issue.

2. **NO `<Table>` component** — Parcel adds `?timestamp` query params to CSV
   imports; `useLoadFile` checks extension BEFORE stripping params → crash.
   Use markdown tables instead.

3. **NO submodule patches** — `.veda/ui` must stay at vanilla v6.20.6.
   Any VEDA-UI bug requiring a patch should go through upstream PR.

### Map with Compare (split-screen date comparison)

```jsx
<Block type='wide'>
  <Figure>
    <Map
      datasetId='soil-moisture-daily'
      layerId='soil-moisture-daily'
      dateTime='2026-02-07'
      compareDateTime='2025-12-15'
      compareLabel='Feb 7 (Peak) vs Dec 15 (Baseline)'
    />
    <Caption>...</Caption>
  </Figure>
</Block>
```

### ScrollytellingBlock Chapter Props

```jsx
<Chapter
  center={[-9, 39]}          // [lon, lat] — Portugal lon is NEGATIVE
  zoom={7}
  datasetId='soil-moisture-daily'
  layerId='soil-moisture-daily'
  datetime='2026-01-27'       // YYYY-MM-DD only, within collection range
>
```

### Chart Props

```jsx
<Chart
  dataPath={new URL('./media/floods/file.csv', import.meta.url).href}
  idKey='Station' xKey='Date' yKey='Value'
  dateFormat='%Y-%m-%d'
  xAxisLabel='...' yAxisLabel='...'
  colors={['#0066cc']}
  highlightStart='2026-01-28' highlightEnd='2026-02-08'
  highlightLabel='Storm Events'
/>
```

### Image Path Pattern

```jsx
<Image src={new URL('./media/floods/file.jpg', import.meta.url).href} alt='...' />
```

### Basemap Styles

Available via `basemapId` in dataset layer config: `'dark' | 'light' | 'satellite' | 'topo'`
Default: Mapbox dark-v11 (from .env MAPBOX_STYLE_URL).

### Projections

Available via `projectionId` in Chapter or Map:
`'globe' | 'mercator' | 'equalEarth' | 'equirectangular' | 'naturalEarth' | 'winkelTripel'`

## Environment

- **Mapbox token:** in `.env.local` (gitignored)
- **Node:** v20 required (`.nvmrc`), use `--ignore-engines` if on v22
- **Dev server:** `yarn --ignore-engines clean && yarn --ignore-engines serve` (Parcel, :9000)
- **Build:** `yarn --ignore-engines build` → `dist/`
- **Clear cache:** `rm -rf .parcel-cache` (required after config changes)

## Vercel Deploy

`vercel.json` configured:
- Build: `yarn --ignore-engines && yarn --ignore-engines build`
- Output: `dist`
- Redirect: `/` → `/stories/winter-2025-26-floods`
- Node: 20.x (not 22)

**Env vars for Vercel dashboard:**
```
MAPBOX_TOKEN=pk.eyJ1IjoibHVuYXNpbHZlc3RyZSIsImEiOiJjbW1tYjQ0dWEwaGZqMnFzN2VyeGgwMmFnIn0.-H5plVRcyzeXJbW4dwzcUw
API_STAC_ENDPOINT=https://api.cheias.pt
API_RASTER_ENDPOINT=https://api.cheias.pt/raster
APP_TITLE=cheias.pt
MAPBOX_STYLE_URL=mapbox://styles/mapbox/dark-v11
```

## Current Story Structure (target after refactor)

1. **ScrollytellingBlock** (4-5 chapters) — atmospheric buildup
2. **Map compare** blocks — soil moisture before/after, precipitation
3. **Charts** — discharge hydrograph, fatality timeline
4. **Images + Prose** — A1 collapse, rainfall anomaly, GPM, discharge comparison
5. **Markdown table** — storm comparison
6. **CompareImage** — Sentinel-2 before/after (if JPEGs converted)
7. **Prose** — recovery, climate attribution

Running: `prompts/story-refactors-v2.md` (Claude Code on atlas)

## Key Decisions Log

| Decision | Rationale |
|----------|-----------|
| eoAPI over rustac | rustac ignores CQL2 + Fields Extension; eoAPI is VEDA-UI's native stack |
| Neon.tech for DB | Free tier, PostGIS, Frankfurt region, connection pooling |
| Single ScrollytellingBlock | Avoids upstream scrollama multi-block bug without patching |
| Markdown tables over `<Table>` | Avoids useLoadFile query-param bug without patching |
| PAGE_OVERRIDES for branding | Official VEDA-UI mechanism, no submodule drift |
| Vercel redirect to story | cheias.pt loads the narrative, not the dashboard |
