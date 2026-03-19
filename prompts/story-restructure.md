# Restructure cheias.pt Story — Single ScrollytellingBlock + Diverse Components

## Context

Current story has 5 ScrollytellingBlocks (18 chapters). This triggers an upstream
scrollama bug (global `[data-step]` selector). Restructure to ONE ScrollytellingBlock
plus diverse VEDA-UI components. No VEDA-UI submodule patches.

## Available media (stories/media/floods/)

- hero-sentinel1-tejo.jpg (hero image)
- a1-collapse-coimbra.jpg (infrastructure damage photo)
- discharge-comparison-story.png (6 rivers, pre-rendered)
- rainfall-anomaly.png (26-year bar chart)
- gpm-precipitation-iberia-feb01-07.jpg (NASA GPM satellite)
- discharge-timeseries.csv (Tejo weekly, for Chart)
- fatality-timeline.csv (cumulative deaths, for Chart)
- storm-comparison.csv (7 storms — use as MARKDOWN TABLE, not Table component)
- rainfall-anomaly.csv (reference only)

## Available STAC datasets (for ScrollytellingBlock chapters)

All require `datasetId` AND `layerId` props. Datetime range: 2025-12-01 to 2026-02-15.

| datasetId | layerId | What it shows |
|-----------|---------|--------------|
| sst-anomaly | sst-anomaly | Atlantic SST anomaly (rdbu_r) |
| soil-moisture-daily | soil-moisture-daily | Soil saturation (viridis) |
| ivt | ivt | Atmospheric river (plasma) |
| precipitation-daily | precipitation-daily | Daily rainfall (blues) |
| mslp | mslp | Sea level pressure (rdbu) |
| precondition | precondition | Compound flood risk (rdbu_r) |

## Narrative Structure

### Hero Section (frontmatter)
Title, cover image, description as usual.

### Part 1: Setting the Stage (ONE ScrollytellingBlock, 6 chapters)
The atmospheric drama — wide-angle maps showing buildup:

```
Chapter 1: SST anomaly, center=[-5, 38], zoom=4, datetime=2026-01-28
  "Warm Water Fuels the Storm" — Atlantic 2-3°C above normal

Chapter 2: Soil moisture, center=[-9.5, 39], zoom=7, datetime=2026-01-27  
  "Soil at Maximum Capacity" — 222% rainfall, soils saturated

Chapter 3: IVT, center=[-8.5, 39.5], zoom=5, datetime=2026-01-28
  "Atmospheric River Arrives" — moisture corridor targets Iberia

Chapter 4: Precipitation, center=[-8.5, 40], zoom=6, datetime=2026-01-28
  "Storm Kristin Makes Landfall" — 209 km/h winds, record-breaking

Chapter 5: MSLP, center=[-8.5, 40], zoom=6, datetime=2026-01-28
  "Deep Pressure System" — 953 hPa central pressure

Chapter 6: Precondition, center=[-9.5, 39], zoom=7, datetime=2026-02-06
  "Compound Risk at Maximum" — every precondition aligned
```

### Part 2: The Storms (Prose + Data, NO ScrollytellingBlock)

Static blocks with charts, tables, images:

```markdown
---

## The Storm Sequence

<Block>
<Prose>
Seven storms hit Portugal between December 31 and February 8...
[brief overview, ~150 words]
</Prose>
</Block>

Storm comparison as MARKDOWN TABLE (not <Table> component):

| Storm | Dates | Max Wind | Deaths | Evacuations | Key Impact |
|-------|-------|----------|--------|-------------|------------|
| Francis | Dec 31–Jan 2 | 115 km/h | 2 | 0 | Setúbal flooding |
| ... | ... | ... | ... | ... | ... |

<Block type='wide'>
<Figure>
  <Chart ... discharge-timeseries.csv />
  <Caption>Tejo river peaks...</Caption>
</Figure>
</Block>

<Block>
<Figure>
  <Image src="a1-collapse-coimbra.jpg" ... />
  <Caption>A1 motorway collapse...</Caption>
</Figure>
</Block>

<Block type='wide'>
<Figure>
  <Chart ... fatality-timeline.csv />
  <Caption>Cumulative deaths...</Caption>
</Figure>
</Block>
```

### Part 3: The Flood (Images + Prose)

```markdown
---

## Mapping the Flood

<Block type='wide'>
<Figure>
  <Image src="discharge-comparison-story.png" ... />
  <Caption>Six rivers compared...</Caption>
</Figure>
</Block>

<Block>
<Prose>
By February 8, 226,764 hectares lay underwater...
</Prose>
</Block>

<Block type='wide'>
<Figure>
  <Image src="gpm-precipitation-iberia-feb01-07.jpg" ... />
  <Caption>NASA GPM satellite...</Caption>
</Figure>
</Block>

<Block type='wide'>
<Figure>
  <Image src="rainfall-anomaly.png" ... />
  <Caption>26-year January rainfall...</Caption>
</Figure>
</Block>
```

### Part 4: Recovery (Prose only)

```markdown
---

## What Comes Next

<Block>
<Prose>
Government response, €2.5B package, climate attribution...
</Prose>
</Block>
```

## CRITICAL RULES

1. Only ONE `<ScrollytellingBlock>` in the entire file
2. Every `<Chapter>` has BOTH `datasetId` and `layerId`
3. NO `<Table>` component anywhere — use markdown tables
4. `<Chart>` is OK (handles Parcel query params correctly)
5. Portugal longitude is NEGATIVE (~-9)
6. Datetimes must be within collection ranges (2025-12-01 to 2026-02-15)
7. `<Image>` uses: `src={new URL('./media/floods/filename.jpg', import.meta.url).href}`
8. Keep prose concise — 100-200 words per block max
9. Do NOT import or reference CompareImage unless before/after JPEGs exist in stories/media/floods/

## Build verification

```bash
cd ~/Documents/dev/cheias-pt-veda-ui
rm -rf .parcel-cache
yarn --ignore-engines clean && yarn --ignore-engines serve
# Must build without errors
# Open localhost:9000/stories/winter-2025-26-floods
# Scroll through — one scrollytelling section, then static content
```

## Commit

```bash
git add stories/
git commit -m "refactor: single ScrollytellingBlock + diverse components

One scrollytelling block (6 chapters) for atmospheric context.
Static blocks for data (charts, images, markdown tables).
Avoids upstream scrollama multi-block bug.
No VEDA-UI submodule patches needed."
git push origin main
```
