# cheias.pt — VEDA Dashboard Build

The production frontend for [cheias.pt](https://cheias.pt), built on NASA IMPACT's [VEDA Dashboard](https://github.com/NASA-IMPACT/veda-ui) framework.

A scrollytelling data story about Portugal's Winter 2025–26 flood crisis — documenting how sequential storms on saturated soils created the country's worst flood disaster in a generation.

## Live

**[cheias.pt](https://cheias.pt)** — deployed on Vercel

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | VEDA Dashboard (veda-ui v6.20.6) — Parcel + React + MapboxGL |
| Data API | eoAPI (stac-fastapi-pgstac + titiler-pgstac + tipg) on Sliplane |
| Database | Neon (PostgreSQL + PostGIS + pgstac) |
| Raster storage | Cloud-Optimized GeoTIFFs on Cloudflare R2 |
| Deployment | Vercel |
| Domain | cheias.pt (Cloudflare DNS) |

## Architecture

```
Browser (cheias.pt)
    ↓
VEDA-UI → STAC search (api.cheias.pt)
    ↓
STAC returns COG asset URLs (data.cheias.pt)
    ↓
titiler-pgstac renders tiles on the fly
    ↓
MapboxGL renders in browser
```

Vector flood extent served via tipg (OGC vector tiles from PostGIS).

## Data

9 STAC collections covering Dec 2025 – Feb 2026:

| Collection | Source | Type |
|-----------|--------|------|
| precipitation-daily | ERA5 reanalysis | raster |
| soil-moisture-daily | ERA5-Land | raster |
| sst-anomaly | NOAA OISST v2.1 | raster |
| ivt | ERA5 (integrated vapor transport) | raster |
| mslp | ERA5 (mean sea level pressure) | raster |
| precondition | Compound flood risk index | raster |
| flood-extent-emsr861 | Copernicus EMS (Coimbra) | vector |
| flood-extent-emsr864 | Copernicus EMS (national) | vector |

## Story

One scrollytelling story (`stories/winter-2025-26-floods.stories.mdx`) with 9 chapters covering SST anomalies → soil saturation → atmospheric rivers → three storms → peak flood extent → climate attribution → recovery.

## Development

```bash
# Prerequisites: Node 20, yarn via corepack
corepack enable

# Install
yarn --ignore-engines
cd .veda/ui && yarn --ignore-engines && cd ../..

# Dev server
node .veda/veda serve
# → localhost:9000
```

Requires a `.env.local` file with a Mapbox token (see `.env.local-sample`).

## Related

- [cheias-pt](https://github.com/lunasilvestre/cheias-pt) — Custom Vite + MapLibre + deck.gl implementation (original build with GSAP animations)
- [VEDA Dashboard](https://github.com/NASA-IMPACT/veda-ui) — The upstream framework

## License

Apache 2.0 (inherits from veda-config-template)
