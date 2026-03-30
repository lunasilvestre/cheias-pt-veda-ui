# i18n Effort Evaluation for cheias.pt

## Context
cheias.pt is a VEDA-UI instance (veda-config fork) deployed on Vercel. The story content is in English MDX. We need to assess the effort to make it bilingual (EN + PT) for a demo on Tuesday March 31.

## Repo
`~/Documents/dev/cheias-pt-veda-ui/`

## Constraints
- **No patching the .veda/ui submodule** (vanilla v6.20.6, no-patches policy)
- Any i18n solution must work within veda-config's content layer (MDX, overrides, veda.config.js)
- The site currently has 1 story: `stories/winter-2025-26-floods.stories.mdx`
- UI chrome is minimal: PAGE_OVERRIDES for header, footer, home redirect
- Must deploy cleanly on Vercel

## Tasks

### 1. Inventory what needs translating
- Read `stories/winter-2025-26-floods.stories.mdx` — count words, count prose blocks, count chapter headings
- Read all files in `overrides/` — identify any user-facing English text in PAGE_OVERRIDES
- Read `veda.config.js` — check for any hardcoded English strings (APP_TITLE, nav labels, etc)
- Check `datasets/*.data.mdx` frontmatter — are `name`, `description` fields user-visible?
- Summarise: total word count to translate, number of files affected

### 2. Research VEDA-UI's content loading
- Read `.veda/ui/` source to understand how stories are loaded (look for MDX glob patterns, file discovery)
- Specifically check: can two story files coexist with different slugs pointing to the same narrative?
- Check if `stories/` supports subdirectories (e.g. `stories/en/`, `stories/pt/`)
- Check how `datasets/*.data.mdx` are referenced — by filename? by `id` in frontmatter?
- Check the routing: what determines the URL path for a story?

### 3. Evaluate three approaches

**Option A: Duplicate MDX (simplest)**
- Duplicate story as `winter-2025-26-floods-pt.stories.mdx` with translated content
- Two separate routes: `/stories/winter-2025-26-floods` (EN) and `/stories/winter-2025-26-floods-pt` (PT)
- Pros/cons, estimated hours, any blockers

**Option B: Route-based locale prefix**
- Could we add `/en/` and `/pt/` prefixes via Vercel rewrites + separate content dirs?
- Would VEDA-UI's router break? Check if it uses react-router and how base paths work
- Pros/cons, estimated hours, any blockers

**Option C: Language switcher component**
- Could a PAGE_OVERRIDE inject a language toggle that swaps story content?
- How does VEDA-UI handle story navigation/state? Could we switch MDX at runtime?
- Pros/cons, estimated hours, any blockers

### 4. Dataset MDX implications
- If story chapters reference `datasetId='sst-anomaly'`, does the PT story need separate dataset MDX files?
- Or can both EN and PT stories reference the same datasets (since data layers are language-independent)?

### 5. Deliverable
Write a report to stdout with:
- Word count / translation scope
- Recommended approach for Tuesday deadline (must be low-risk)
- Recommended approach for post-demo (proper solution)
- Estimated hours for each
- Any gotchas or blockers discovered
- Draft plan: which files to create/modify, in what order
