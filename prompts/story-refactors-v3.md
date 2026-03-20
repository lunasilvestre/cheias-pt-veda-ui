# cheias.pt Story Refactors v3 — Visual QA Fixes

## Context

Story is rendering at `localhost:9000/stories/winter-2025-26-floods`.
Six visual bugs identified from QA screenshots. This prompt targets
Claude Code on atlas with full filesystem + network access.

**Repos:**
- `~/Documents/dev/cheias-pt-veda-ui` — VEDA-UI instance (story, datasets, config)
- `~/Documents/dev/cheias-pt` — source data (GeoJSON, TIFs, CSVs)
- `~/Documents/dev/cheias-pt-stac` — STAC catalog + eoAPI deployment config

**Live eoAPI stack at `api.cheias.pt`:**
- STAC: `https://api.cheias.pt/` (stac-fastapi-pgstac)
- Raster: `https://api.cheias.pt/raster/` (titiler-pgstac)
- Vector: `https://api.cheias.pt/vector/` (tipg → PostGIS on Neon)
- `.env` in cheias-pt-veda-ui already points at these endpoints

**PostGIS vector collections (confirmed working via tipg):**
```
public.flood_extent_emsr861  — 506 features (Coimbra region, EMSR861)
public.flood_extent_emsr864  — 14,747 features (national, EMSR864)
```

**STAC collections (11 total, confirmed via `api.cheias.pt/collections`):**
```
flood-extent-emsr861, flood-extent-emsr864, ivt, mslp,
precipitation-daily, precondition, satellite-ir,
soil-moisture-daily, sst-anomaly, wind-u, wind-v
```

Both flood-extent STAC collections have `rel: external` links pointing to tipg.
Vector tiles confirmed serving with source-layer name `default` (matches VEDA-UI expectation).

**VEDA-UI Compare component behavior (CONFIRMED by reading source):**
In `block-map.tsx` lines 270-370:
- `dateTime` → base layer → renders on **LEFT** side of compare slider
- `compareDateTime` → compare layer → renders on **RIGHT** side of compare slider
This is the opposite of what was previously assumed.

**Key VEDA-UI docs:**
- `docs/content/MDX_BLOCKS.md` — Block, Map, Chart, ScrollytellingBlock, Chapter syntax
- `docs/content/frontmatter/layer.md` — Layer props: type, sourceParams, legend, compare
- Vector type docs: `type: vector` requires STAC collection with `rel: external` link → tipg tiles with `source-layer: default`

---

## Bug 1: Precipitation — nodata=0 Makes Zero-Rainfall Transparent

**Symptom:** In the precipitation compare map and scrollytelling chapter, areas
with 0 mm rainfall are fully transparent (showing basemap through), so most
of Portugal disappears on dry days. Only rainy patches are visible.

**Root cause:** `datasets/precipitation.data.mdx` has `nodata: 0` in sourceParams.
Combined with `return_mask: true`, TiTiler masks every pixel where value == 0.
But 0 mm is valid data (no rain), not nodata.

**Investigation needed:** Check what nodata value the COGs actually use:
```bash
# Check a precipitation COG's internal nodata
gdalinfo /path/to/precipitation/2026-01-28.tif | grep -i nodata
# OR via titiler:
curl "https://api.cheias.pt/raster/cog/statistics?url=https://data.cheias.pt/precipitation/2026-01-28.tif"
```

**Fix options (pick based on COG inspection):**
A) If COGs use NaN as internal nodata: change `nodata: nan` in sourceParams
B) If COGs use a sentinel value (e.g. -9999): change `nodata: -9999` in sourceParams
C) If COGs have 0 as nodata in their metadata and that can't change:
   remove `return_mask: true` so 0 renders as the lightest color
D) Nuclear option: re-process COGs with `--nodata nan` flag in the
   `cheias-pt-stac` catalog builder and re-upload to R2

**File:** `datasets/precipitation.data.mdx`

---

## Bug 2: Soil Moisture — Low Values (Purple) Appear Transparent

**Symptom:** In the soil moisture scrollytelling chapter, the viridis
colormap renders correctly over Portugal, but ocean/outside areas that
should be nodata appear as very dark purple rather than transparent.
The user reports "0(purple) = transparent" — values near the bottom
of the rescale range (0.05) blend with the dark basemap.

**Investigation needed:** Same as Bug 1 — check actual nodata value in COGs:
```bash
gdalinfo ~/Documents/dev/cheias-pt/data/soil-moisture/2026-01-27.tif | grep -i nodata
```

**Fix options:**
A) If the COG nodata is NaN (likely for ERA5-Land): change `nodata: nan`
B) The real rendering issue may be that viridis purple (#440154) is nearly
   black and invisible against the dark basemap. Consider using
   `basemapId: 'light'` for the soil moisture layer in the dataset MDX
   so the purple shows clearly.
C) Alternatively, shift the rescale range start from 0.05 to 0.10 so
   very dry areas (rare in this flood context) map to transparent-ish.

**File:** `datasets/soil-moisture.data.mdx`

---

## Bug 3: Precondition Layer Not Visible in Scrollytelling

**Symptom:** The "Compound Risk: Maximum" scrollytelling chapter shows only
the basemap — no colored overlay. The legend IS visible in the bottom-right
corner (confirmed in screenshot). TiTiler tiles render OK (12KB at z7).

**Investigation needed:**
1. Check if the `rdbu_r` colormap mid-range (white) is causing Portugal
   values to appear invisible against the terrain basemap:
```bash
# Get actual value range for Jan 27
curl "https://api.cheias.pt/raster/cog/statistics?url=https://data.cheias.pt/precondition/2026-01-27.tif"
```
2. The rescale is `0, 113` and the rdbu_r midpoint is white at ~56.
   If Jan 27 values cluster around 50-60, they'd be near-white = invisible.
3. The `return_mask: true` + `nodata: -9999` should work, but verify the
   COG's actual nodata value.

**Fix options:**
A) Switch colormap to one without a white midpoint: `reds`, `oranges`,
   `ylorrd`, or `hot_r` — anything that shows data clearly against basemap
B) Use `basemapId: 'dark'` to make even light colors visible
C) Adjust the rescale range to map Jan 27 values to the more visible
   ends of the colormap
D) If the issue is nodata mismatch, fix the nodata value as in Bug 1/2

**File:** `datasets/precondition.data.mdx`

---

## Bug 4: Compare Maps — Before/After Sides Swapped

**Symptom:** In both the soil moisture and precipitation compare maps,
the "before" date appears on the RIGHT and the "after" date on the LEFT.
Convention is before=left, after=right.

**Root cause (CONFIRMED from VEDA-UI source, block-map.tsx:270-370):**
- `dateTime` → base layer → LEFT side of slider
- `compareDateTime` → compare layer → RIGHT side of slider

Current story has:
```jsx
dateTime='2026-02-08' compareDateTime='2025-12-15'   // Feb 8 LEFT, Dec 15 RIGHT — WRONG
dateTime='2026-02-06' compareDateTime='2026-01-28'   // Feb 6 LEFT, Jan 28 RIGHT — WRONG
```

**Fix:** Swap the date values AND update labels:

Soil moisture compare:
```jsx
<Map
  datasetId='soil-moisture-daily'
  layerId='soil-moisture-daily'
  dateTime='2025-12-15'
  compareDateTime='2026-02-08'
  compareLabel='Baseline (Dec 15) vs Peak Flood (Feb 8)'
  zoom={7}
  center={[-9, 39]}
/>
```

Precipitation compare:
```jsx
<Map
  datasetId='precipitation-daily'
  layerId='precipitation-daily'
  dateTime='2026-01-28'
  compareDateTime='2026-02-06'
  compareLabel='Kristin (Jan 28) vs Leonardo (Feb 6)'
  zoom={6}
  center={[-9, 39.5]}
/>
```

**File:** `stories/winter-2025-26-floods.stories.mdx`

---

## Bug 5: Fatality Chart — Replace With Something Meaningful

**Symptom:** The cumulative deaths chart (fatality-timeline.csv) is
inappropriate for the story's tone and adds no analytical value.

**Replacement:** Economic/infrastructure impact timeline or
agricultural damage summary. Options ranked by impact:

**Option A — Storm Impact Summary (horizontal bar chart):**
Create `stories/media/floods/storm-impact-summary.csv`:
```csv
Storm,Evacuated,Without_Power,Agricultural_ha
Kristin,0,1000000,50000
Leonardo,1100,200000,80000
Marta,11000,500000,96000
```
Use a grouped bar chart with `idKey='Storm'` showing the three
dimensions of impact per storm. This is more analytical and
demonstrates compound escalation.

**Option B — Evacuation Timeline (line chart):**
Create `stories/media/floods/evacuation-timeline.csv` with
cumulative evacuations over time — shows the escalating humanitarian
response across the three storms.

**Option C — Simply remove the chart and expand the prose block
with a more detailed written account of impacts.**

Pick the option that creates the strongest visual narrative
without being insensitive. Replace both the Chart block AND caption.

**File:** `stories/winter-2025-26-floods.stories.mdx` +
`stories/media/floods/` (new CSV)

---

## Bug 6: Peak Flood Extent — Vector Polygons Not Rendering

**Symptom:** The Peak Flood Extent compare map shows satellite basemap
and the compare slider, but NO flood polygons are visible on either
side. The map is empty.

**Investigation chain:**
1. Confirm tipg vector tiles serve with `source-layer: default`:
```bash
curl -s "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864/tiles/WebMercatorQuad/8/121/97" \
  -o /tmp/tile.pbf && python3 -c "
import re
with open('/tmp/tile.pbf','rb') as f:
    data = f.read(200)
    strings = re.findall(r'[\x20-\x7e]{3,}', data.decode('latin-1'))
    print(f'Source layers: {strings}')
"
```
(Already confirmed: source-layer is `default`, tile is 906KB)

2. Check if VEDA-UI `VectorTimeseries` component discovers the tipg endpoint:
```
# The component at:
# .veda/ui/packages/veda-ui/src/components/common/map/style-generators/vector-timeseries.tsx
# fetches {STAC_ENDPOINT}/collections/{stacCol}
# then looks for link with rel=external
# then builds tile URL: {external_href}/tiles/WebMercatorQuad/{z}/{x}/{y}
```

3. Test the actual tile URL chain:
```bash
# Does STAC return the external link?
curl -s "https://api.cheias.pt/collections/flood-extent-emsr864" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print([l for l in d['links'] if l['rel']=='external'])"
# Expected: href=https://api.cheias.pt/vector/collections/public.flood_extent_emsr864

# Does tipg return the tile endpoint?
curl -s "https://api.cheias.pt/vector/collections/public.flood_extent_emsr864/tiles" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin),indent=2)[:500])"
```

4. Open browser DevTools on localhost:9000, navigate to Peak Flood Extent,
   check Network tab for vector tile requests (pbf/mvt). Check Console for
   errors. This is the most reliable debugging approach.

**Likely root causes (investigate in order):**
A) The `VectorTimeseries` component may require a temporal item in the STAC
   collection. The flood-extent-emsr864 collection has NO items (it's a
   static vector dataset). VEDA-UI may refuse to render if it can't find
   a matching datetime item. Fix: add a dummy STAC item.

B) The compare config references `flood-extent-emsr861` as the compare
   layer. If that dataset's STAC collection also has no items, the compare
   initialization may fail silently and prevent both layers from rendering.

C) The `zoom` is set to 8 and `zoomExtent` starts at 6. At z8 the
   tiles should load. But if the map's initial viewport is wrong
   (center `[-8.9, 39.7]` is the Tejo valley, correct for Coimbra/Salvaterra),
   the tiles might be outside the viewport.

**Fix (for cause A — most likely):**
Create dummy STAC items for both flood-extent collections:
```bash
export DATABASE_URL="..." # set from env

# Create minimal STAC items
python3 -c "
import json
for coll, date in [('flood-extent-emsr864', '2026-02-08'), ('flood-extent-emsr861', '2026-01-30')]:
    item = {
        'type': 'Feature',
        'stac_version': '1.0.0',
        'id': f'{coll}-{date}',
        'geometry': {'type': 'Polygon', 'coordinates': [[[-9.5,37],[-6,37],[-6,42.2],[-9.5,42.2],[-9.5,37]]]},
        'bbox': [-9.5, 37, -6, 42.2],
        'properties': {'datetime': f'{date}T00:00:00Z'},
        'collection': coll,
        'links': [],
        'assets': {}
    }
    with open(f'/tmp/{coll}-item.json', 'w') as f:
        json.dump({'type': 'FeatureCollection', 'features': [item]}, f)
    print(f'Created /tmp/{coll}-item.json')
"

pypgstac load items /tmp/flood-extent-emsr864-item.json --dsn "\$DATABASE_URL" --method upsert
pypgstac load items /tmp/flood-extent-emsr861-item.json --dsn "\$DATABASE_URL" --method upsert
```

**3D Terrain — Post-v0 unless quick:**
VEDA-UI doesn't expose a terrain prop. Options:
- Create a custom Mapbox Studio style with terrain enabled and set via `MAPBOX_STYLE_URL`
- OR patch `block-map.tsx` to add terrain on satellite basemap (submodule edit)
Both are invasive for v0. Ship with flat satellite first, add terrain post-demo.

**File:** `datasets/flood-extent.data.mdx`, `datasets/flood-extent-emsr861.data.mdx`,
`stories/winter-2025-26-floods.stories.mdx`

---

## Execution Order

1. **Bug 4** — Swap compare date order (30 seconds, story MDX only)
2. **Bug 1** — Fix precipitation nodata (inspect COG first, then update dataset MDX)
3. **Bug 2** — Fix soil moisture nodata/basemap (inspect COG first, then update)
4. **Bug 3** — Fix precondition visibility (inspect values, change colormap/basemap)
5. **Bug 5** — Replace fatality chart (create new CSV + update story MDX)
6. **Bug 6** — Fix vector flood extent (create dummy STAC items if needed)

---

## Verification Protocol (MANDATORY — run after EVERY change)

```bash
cd ~/Documents/dev/cheias-pt-veda-ui
rm -rf .parcel-cache && yarn --ignore-engines clean && yarn --ignore-engines serve
# Open http://localhost:9000/stories/winter-2025-26-floods
```

**Visual checklist per bug:**

| Bug | What to check | Pass criteria |
|-----|--------------|---------------|
| 1 | Precipitation scrollytelling chapter (Jan 28) | Portugal shows continuous gradient, 0mm = lightest blue (NOT transparent) |
| 2 | Soil moisture scrollytelling chapter (Jan 27) | All of Portugal colored, nodata areas (ocean/Spain) transparent, colors visible against basemap |
| 3 | Precondition scrollytelling chapter (Jan 27) | Colored overlay visible over Portugal's landmass |
| 4 | Soil moisture compare map | LEFT = Dec 15 (drier), RIGHT = Feb 8 (saturated). Label matches |
| 4 | Precipitation compare map | LEFT = Jan 28 (Kristin), RIGHT = Feb 6 (Leonardo). Label matches |
| 5 | Human Cost section | No fatality chart. Replacement chart/content renders correctly |
| 6 | Peak Flood Extent map | Blue/colored flood polygons visible over satellite basemap on BOTH sides of compare slider |

**Also check:** Open DevTools Console — zero errors related to STAC fetch, tile loading, or vector source.

---

## Agent Team Structure (for Claude Code `--agents`)

### Agent 1: COG Inspector
**Task:** Determine actual nodata values for ALL raster COGs.
```bash
for layer in precipitation soil-moisture precondition sst-anomaly ivt mslp; do
  # Find a sample COG
  SAMPLE=$(ls ~/Documents/dev/cheias-pt/data/${layer}/*.tif 2>/dev/null | head -1)
  if [ -z "$SAMPLE" ]; then
    # Try via R2 direct download (check the STAC item for href)
    echo "$layer: no local TIF, check remote"
  else
    echo "=== $layer ==="
    gdalinfo "$SAMPLE" 2>/dev/null | grep -E "NoData|Type|Size|Band"
    python3 -c "
import rasterio
with rasterio.open('$SAMPLE') as src:
    print(f'  nodata={src.nodata}, dtype={src.dtypes[0]}')
    data = src.read(1)
    import numpy as np
    print(f'  min={np.nanmin(data):.4f}, max={np.nanmax(data):.4f}')
    print(f'  zeros={np.sum(data==0)}, nans={np.sum(np.isnan(data))}')
    print(f'  nodata_count={np.sum(data==src.nodata) if src.nodata else \"N/A\"}')
"
  fi
done
```
**Deliverable:** A table of `{layer: actual_nodata_value}` for all raster datasets.

### Agent 2: Dataset MDX Fixer
**Depends on:** Agent 1 output.
**Task:** Update all `datasets/*.data.mdx` files:
- Set correct `nodata:` values per Agent 1 findings
- Keep `return_mask: true` for transparency
- Fix soil moisture basemap to `basemapId: 'light'` if needed
- Fix precondition colormap if white-midpoint is the issue
**Deliverable:** Updated dataset MDX files.

### Agent 3: Story MDX Fixer
**Task:** Update `stories/winter-2025-26-floods.stories.mdx`:
- Swap compare date order (Bug 4)
- Replace fatality chart (Bug 5) — create new CSV + update blocks
- Any adjustments to Peak Flood Extent block (Bug 6)
**Deliverable:** Updated story MDX + new CSV files.

### Agent 4: Vector Layer Debugger
**Task:** Fix Peak Flood Extent rendering (Bug 6):
- Check if STAC items exist for flood-extent collections
- If not, create and load dummy items via pypgstac
- Test vector tile rendering end-to-end
- Use DevTools approach if possible (may need interactive debugging)
**Deliverable:** Working vector flood polygons on satellite basemap.

### Team Lead (validator)
**Runs after all agents complete.**
**Task:** Full rebuild + visual QA against the verification checklist above.
Reject and re-assign if any check fails. Be brutal — if it doesn't look
right in the browser, it's not done.

---

## Commit

```bash
cd ~/Documents/dev/cheias-pt-veda-ui
git add stories/ datasets/
git commit -m "fix: visual QA — nodata, compare order, precondition, vector flood extent

- Fix nodata values for precipitation, soil-moisture, precondition (per COG inspection)
- Swap compare dateTime/compareDateTime for correct before=left, after=right
- Fix precondition layer visibility (colormap/basemap adjustment)
- Replace fatality chart with [replacement description]
- Fix vector flood extent rendering (add STAC items for vector collections)
- Adjust basemap and legend for visual clarity"
git push origin main
```
