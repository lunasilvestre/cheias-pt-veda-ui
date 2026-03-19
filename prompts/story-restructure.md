# Restructure cheias.pt Story — v0 with Dignity

## Context

Restructure from 5 broken ScrollytellingBlocks to a diverse, visually compelling
narrative using the full VEDA-UI component palette. No submodule patches needed.

Reference: `~/Documents/dev/cheias-pt/tasks/cheias-component-showcase.md`
VEDA-UI sandbox: `.veda/ui/packages/veda-ui/src/components/sandbox/legacy/mdx-page/page.mdx`

## Available Components (confirmed working)

### ScrollytellingBlock + Chapter (ONE block only)
```jsx
<ScrollytellingBlock>
  <Chapter center={[-9, 39]} zoom={7} datasetId='X' layerId='Y' datetime='YYYY-MM-DD'>
    ### Title
    Prose here...
  </Chapter>
</ScrollytellingBlock>
```

### Map with Compare (split-screen date comparison!)
```jsx
<Block type='wide'>
  <Figure>
    <Map
      datasetId='soil-moisture-daily'
      layerId='soil-moisture-daily'
      dateTime='2026-02-07'
      compareDateTime='2025-12-15'
      compareLabel='Feb 7 (Peak Flood) vs Dec 15 (Baseline)'
    />
    <Caption>Caption here</Caption>
  </Figure>
</Block>
```

### Standalone Map (single date, no scrollytelling)
```jsx
<Block type='full'>
  <Figure>
    <Map
      datasetId='precipitation-daily'
      layerId='precipitation-daily'
      dateTime='2026-01-28'
      zoom={7}
      center={[-8.5, 39]}
    />
    <Caption>Caption</Caption>
  </Figure>
</Block>
```

### CompareImage (satellite before/after slider)
```jsx
<Block type='full'>
  <Figure>
    <CompareImage
      leftImageSrc={new URL('./media/floods/salvaterra-before-20260106.jpg', import.meta.url).href}
      leftImageAlt='Salvaterra floodplain Jan 6 2026'
      leftImageLabel='Jan 6 — Before Floods'
      rightImageSrc={new URL('./media/floods/salvaterra-after-20260220.jpg', import.meta.url).href}
      rightImageAlt='Salvaterra floodplain Feb 20 2026'
      rightImageLabel='Feb 20 — Peak Flood'
    />
    <Caption>Caption</Caption>
  </Figure>
</Block>
```

### Chart (recharts line chart)
```jsx
<Block type='wide'>
  <Figure>
    <Chart
      dataPath={new URL('./media/floods/discharge-timeseries.csv', import.meta.url).href}
      idKey='Station' xKey='Date' yKey='Discharge_m3s'
      dateFormat='%Y-%m-%d'
      xAxisLabel='Date' yAxisLabel='Discharge (m³/s)'
      altTitle='Title' altDesc='Description'
      colors={['#0066cc']}
      highlightStart='2026-01-28' highlightEnd='2026-02-08'
      highlightLabel='Storm Events'
    />
    <Caption>Caption</Caption>
  </Figure>
</Block>
```

### Image (pre-rendered figures)
```jsx
<Block type='wide'>
  <Figure>
    <Image
      src={new URL('./media/floods/rainfall-anomaly.png', import.meta.url).href}
      alt='Alt text'
    />
    <Caption attrAuthor='Source' attrUrl='https://...'>Caption</Caption>
  </Figure>
</Block>
```

### Prose + Figure side by side
```jsx
<Block>
  <Figure>
    <Image src={new URL('./media/floods/a1-collapse-coimbra.jpg', import.meta.url).href} alt='...' />
    <Caption>...</Caption>
  </Figure>
  <Prose>
    ### Title
    Text alongside the image...
  </Prose>
</Block>
```

## Available Datasets for Map/ScrollytellingBlock

| datasetId | layerId | Best for | Datetime range |
|-----------|---------|----------|----------------|
| sst-anomaly | sst-anomaly | Atlantic warming context | 2025-12-01 – 2026-02-04 |
| soil-moisture-daily | soil-moisture-daily | Saturation before/during flood | 2025-12-01 – 2026-02-15 |
| ivt | ivt | Atmospheric river visualization | 2025-12-01 – 2026-02-15 |
| precipitation-daily | precipitation-daily | Storm rainfall | 2025-12-01 – 2026-02-15 |
| mslp | mslp | Pressure system depth | 2025-12-01 – 2026-02-15 |
| precondition | precondition | Compound risk index | 2025-12-01 – 2026-02-15 |

## Available Media (stories/media/floods/)

- hero-sentinel1-tejo.jpg — SAR image for hero
- a1-collapse-coimbra.jpg — infrastructure damage
- discharge-comparison-story.png — 6 rivers pre-rendered
- rainfall-anomaly.png — 26-year bar chart
- gpm-precipitation-iberia-feb01-07.jpg — NASA GPM
- discharge-timeseries.csv — for Chart component
- fatality-timeline.csv — for Chart component
- storm-comparison.csv — for MARKDOWN TABLE (not Table component)

## Sentinel-2 Before/After (NEEDS CONVERSION FIRST)

Convert GeoTIFFs to web JPEGs before using CompareImage:
```bash
cd ~/Documents/dev/cheias-pt
python3 << 'PYEOF'
import rasterio, numpy as np
from PIL import Image
import os

for name, src in [
    ("salvaterra-before-20260106", "data/sentinel-2/salvaterra-before-20260106.tif"),
    ("salvaterra-after-20260220", "data/sentinel-2/salvaterra-after-20260220.tif"),
]:
    with rasterio.open(src) as s:
        r, g, b = s.read(1), s.read(2), s.read(3)
    def norm(band):
        band = band.astype(float)
        p2, p98 = np.percentile(band[band > 0], (2, 98))
        return np.clip((band - p2) / (p98 - p2) * 255, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.stack([norm(r), norm(g), norm(b)], axis=-1))
    if img.width > 2000:
        img = img.resize((2000, int(img.height * 2000 / img.width)), Image.LANCZOS)
    out = f"../cheias-pt-veda-ui/stories/media/floods/{name}.jpg"
    img.save(out, "JPEG", quality=85)
    print(f"  {name}: {os.path.getsize(out)//1024}KB")
PYEOF
```
If conversion fails or images don't exist, skip CompareImage sections.

## Narrative Structure

### Hero + Introduction
Standard story frontmatter with hero image.

### Part 1: The Buildup (ONE ScrollytellingBlock, 4-5 chapters MAX)
Pick the 4-5 MOST visually striking layers. Each chapter ~50-80 words.

1. **SST anomaly** — wide Atlantic view, warm colors, zoom 4
2. **IVT atmospheric river** — dramatic plasma colormap, zoom 5
3. **Precipitation** — Kristin landfall, blues colormap, zoom 6
4. **Soil moisture** — Portugal saturated, viridis, zoom 7
5. **Precondition** — compound risk maxed out, zoom 7

### Part 2: Compare Maps (Map blocks with compareDateTime)
The visual hook — side-by-side comparisons:

- **Soil moisture: Dec 15 vs Feb 7** — before/after saturation
- **Precipitation: Jan 28 vs Feb 6** — Kristin vs Leonardo rainfall patterns

### Part 3: The Data Story (Charts + Images + Prose)
Mixed content blocks:

- Storm comparison MARKDOWN TABLE
- Discharge hydrograph CHART
- A1 collapse PHOTO with prose alongside
- Fatality timeline CHART
- Rainfall anomaly IMAGE (pre-rendered)
- Discharge comparison IMAGE (pre-rendered)
- GPM precipitation IMAGE

### Part 4: Satellite Evidence (CompareImage if JPEGs exist)
If Sentinel-2 JPEGs were converted:
- Salvaterra before/after CompareImage (the showstopper)

If not available, use the GPM precipitation image instead.

### Part 5: Recovery (Prose)
Closing narrative — government response, costs, climate context.

## CRITICAL RULES

1. **ONE ScrollytellingBlock** in the entire file (upstream bug with multiple)
2. Every Chapter needs `datasetId` AND `layerId`
3. **NO `<Table>` component** — use markdown tables
4. Portugal longitude is NEGATIVE (~-9)
5. Datetimes within 2025-12-01 to 2026-02-15
6. Image paths: `{new URL('./media/floods/file.jpg', import.meta.url).href}`
7. Map compare: use `compareDateTime` prop for split-screen
8. Keep prose SHORT (50-150 words per block)
9. Test build: `rm -rf .parcel-cache && yarn --ignore-engines clean && yarn --ignore-engines serve`

## Commit

```bash
cd ~/Documents/dev/cheias-pt-veda-ui
git add stories/ 
git commit -m "refactor: single ScrollytellingBlock + compare maps + diverse components

- 1 ScrollytellingBlock (4-5 chapters) for atmospheric context
- Map compare blocks (split-screen soil moisture, precipitation)
- Chart blocks (discharge, fatality timeline)
- Image blocks (rainfall anomaly, GPM, A1 collapse, discharge comparison)
- Markdown tables (storm comparison)
- CompareImage (satellite before/after, if available)
- No VEDA-UI submodule patches needed"
git push origin main
```
