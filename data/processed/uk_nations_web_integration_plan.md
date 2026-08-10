# UK Nations Web Integration Plan — School Place

**Status:** Research & design only (no code changes made)
**Date:** 2026-08-10
**Scope:** Add Wales (1,441), Scotland (2,483), Northern Ireland (1,555) school data to the live School Place web app (England: 21,990 schools).

All facts below were verified against the on-disk CSVs, `data/pipeline/build_national_webdata.py`, `web/lib/data.ts`, `web/lib/utils.ts`, `web/components/school-map.tsx`, `web/app/(content)/school/[slug]/page.tsx`, `web/app/page.tsx`, `web/public/data/{schools,districts,slugs,meta}.json`.

---

## 1. Current state (verified)

### 1.1 England web data shape
- `web/public/data/schools.json` — flat list of **21,990** schools. Each entry:
  `{ urn: int, name, slug, phase: "Nursery"|"Primary"|"Secondary"|"Special"|"PRU", type, la, postcode, lat, lng, pupils, ofsted, ofsted_grade, ofsted_date, mat, admissions_policy, ward, district, lsoa, derived_ofsted, derived_ofsted_source }`
- `web/public/data/schools/<slug>.json` — one merged per-school record per school (86 MB total, ~5–15 KB each): `{ school, ofsted, perf, perf_history, chars, admissions, crime, prices, flood, data_as_of }`. Built by `data/pipeline/build_national_webdata.py`, which loops layers `[schools.json, ofsted_full.json, performance.json, performance_history.json, characteristics.json, admissions.json, crime.json, prices.json, flood.json, meta.json]` keyed by **England URN** (int) or LSOA/district for the geo layers.
- `web/public/data/districts.json` — `{ lowercase_postcode_district: [slug,...] }` (2,035 keys, England only — no `bt1`/`cf10`/`eh1` present).
- `web/public/data/slugs.json` — `{ slug: urn }` (22k entries).
- `web/public/data/meta.json` — `{ region: "England", schools: 21990, by_la, by_grade, data_as_of, source }`.
- Slug generator (`data/pipeline/build_db_national.py:21`): `slugify(name, urn)` → lowercase, non-alnum → `-`, collapse, then append `-{urn}`. E.g. `the-aldgate-school-100000`.
- Map (`school-map.tsx`) colours pins by `effectiveOfsted(s)` = `derived_ofsted ?? ofsted`; grey fallback `hsl(220,8%,55%)`; search placeholder hardcodes **"Search 21,990 schools"**; legend has 5 rows incl. "Not judged / no data".
- School page reads `getSchoolData(slug)`; `jsonLd.identifier = school.urn`; stats grid uses `perf.gcse/ks2`, `chars.fsm_pct`, `school.pupils`.
- Geocoding pattern exists: `data/pipeline/geocode_national.py` (postcodes.io bulk 100/call, checkpoint JSON, appends `lat/lng/oa21/lsoa/msoa/ward/district/parish`).

### 1.2 UK-nation CSVs (on disk, verified)

| File | Rows | Key col | Coords? | Notes |
|---|---|---|---|---|
| `data/processed/uk_wales_schools.csv` | 1,441 | `ref` (7-digit, all numeric, unique) | **NO lat/lng, NO postcode, NO address** | cols: ref,name,la,sector,type,governance,language,pupils,fsm_eligible,aln_pupils. Sector: Primary 1,193 / Secondary 173 / Special 39 / Middle 31 / Nursery 5. Language: Welsh medium 403, Dual 73, English medium 921, N/A 44. fsm missing 102, aln missing 217. 8 duplicate names. |
| `data/processed/uk_scotland_schools.csv` | 2,483 | `seed` (7-digit, 2,449 unique) | **lat/lng 100%**, postcode 100% | cols: seed,schuid,school_type,centre_type,name,address1-3,postcode,la,la_code,datazone,uprn,denomination,fte_teacher,pupil_roll,prop_minority_ethnic,prop_20pc_most_deprived,dz_simd_percentile,dz_simd_most_deprived_{15pct,16_25pct,25pct},urban_rural_{8,6}(+desc),grid_easting,northing. school_type: Primary 1,991 / Special 129 / Secondary 363. **34 campus schools have duplicate SEEDs** (e.g. Aith Junior High School = Primary row + Secondary row; Berwickshire High = Special row roll 0 + Secondary row). 27 rows roll=0. 146 duplicate names. |
| `data/processed/uk_ni_schools.csv` | 1,555 | `ref` (7-char, alphanumeric — 402 contain letters, e.g. `1AB0427`; unique) | **lat/lng 100%**, postcode 100% | cols: ref,name,address,town,county,postcode,type,management,lat,lng,enrolment,ptr. type: Primary 807 / VP Pre-schools 401 / Secondary (non-grammar) 135 / Nursery 95 / Secondary (grammar) 65 / Special 39 / Preparatory 12 / Peripatetic 1. enrolment missing 548 (all VP Pre-school, Special, Nursery, Preparatory, Peripatetic); ptr missing 402. 60 duplicate names. |
| `data/processed/uk_ni_performance.csv` | 186 | `ref` | — | SAER 2024/25: y12_eligible, pct_5plus_gcse_entered, pct_5plus_gcse_ac, pct_5plus_gcse_ac_engmaths, alevel_eligible, pct_3plus_alevel_ac, pct_2plus_alevel_ae. **177/186 refs match the NI register** (9 unmatched = closed/renamed post-primary schools). |
| `data/processed/uk_scotland_attainment.csv` | 367 | `seed` | — | avg_total_tariff, avg_tariff, avg_comp_tariff, pct_5plus_scqf6/5, pct_3plus_scqf6, pct_1plus_scqf6/5/4/3. 357/367 seeds match register. Sparse: many rows have only `avg_total_tariff`. |
| `data/processed/uk_scotland_destinations.csv` | 361 | `seed` + `year` | — | pct_positive_destination per academic year (2024-25: 237 rows, back to 2015-16). 351/361 seeds match register. **Multiple rows per school** — must take latest year. |

### 1.3 Key architecture constraints
- `urn` is typed `number` in `web/lib/utils.ts` and used as `Record<number,...>` keys in `app/page.tsx` (reach map) and `String(s.urn)` lookups in league-tables/compare. **Prefixing breaks the `number` type → one deliberate widening needed (see §2.1).**
- Per-school files are the only read per school page; all layer JSONs are keyed by England URN. UK-nation layers must be keyed by **prefixed URN strings** so England's builder stays untouched.
- `districts.json`/`slugs.json` are written from scratch by the England builder — a UK builder must **read-append** rather than rewrite.
- Static export (`next.config.mjs`): every school page is a generated static file; +5,479 schools = +5,479 pages. Build time grows linearly (currently ~22k pages).

---

## 2. Schema unification

### 2.1 URN strategy — prefix scheme (no collisions by construction)

England URNs are integers in the 100000–150000 range. UK refs are 7-digit (Wales, Scotland) or 7-char alphanumeric (NI). Because Wales refs are *numeric-looking* (6602130), Scotland SEEDs are 7-digit, and NI refs can be purely numeric too, a bare numeric merge could theoretically collide with England URNs and — worse — NI `1AB0427` vs numeric forms can't share a column cleanly.

**Design: single `urn` field, string values, nation-prefixed for non-England:**

| Nation | Key source | urn value | Example |
|---|---|---|---|
| England | URN | unchanged int | `100000` |
| Wales | `ref` | `"W-" + ref` | `W-6602130` |
| Scotland | `seed` | `"S-" + seed` | `S-8212627` |
| NI | `ref` | `"N-" + ref` | `N-1AB0427` |

- Prefix guarantees global uniqueness: `W-`/`S-`/`N-` can never collide with each other or with a bare England integer (England URNs are never prefixed).
- **Scotland duplicate-SEED campus rows** (§1.2): two rows share `S-8212627`. Resolve at build time with a per-row suffix: `S-8212627-P` (primary) / `S-8212627-S` (secondary) — or disambiguate by `school_type`. Drop Special rows with `pupil_roll == 0` that duplicate a Secondary row for the same seed (e.g. Berwickshire High School Special roll 0 + Secondary) — they are the same campus, not a separate school; **keep** genuinely dual-phase rows (Aith Junior High Primary 102 + Secondary 116).
- NI: 9 SAER refs with no register match → **exclude from schools.json**; optionally keep in the perf layer under `N-<ref>` for a "closed schools" future note. Do not invent rows.
- **Type change:** `School.urn: number` → `string | number` (England stays int so `String()` lookups and JSON-LD still work; prefix strings flow through untouched). Touch points: `web/lib/utils.ts` (type), `web/app/page.tsx` (reach `Record<number,...>` → `Record<string|number,...>`), `web/app/(content)/compare/page.tsx` + `league-tables/page.tsx` (`urn: number` in local types, `String(s.urn)` already safe), `school-map.tsx` (`schools.find(x => x.urn === f.properties?.urn)` already works for both since MapLibre keeps numbers as numbers). `slugs.json` values become `int | string` — fine for JSON.
- Add `nation: "england" | "wales" | "scotland" | "ni"` to every school object (derivable from urn prefix at build time; explicit field is cheaper at render time).

### 2.2 Phase mapping (nation CSV → England PHASES)

`PHASES = ["Nursery","Primary","Secondary","Special","PRU"]` (do not extend — filter chips and reach defaults depend on it):

| Nation source | → phase |
|---|---|
| Wales `sector`: Primary schools / Secondary schools / Special schools / Nursery schools | Primary / Secondary / Special / Nursery |
| Wales `sector`: Middle schools (ages 3–16/19) | **Primary** (flag as decision point; ages straddle phases. Keeping phase=Primary keeps all-through schools findable under the dominant phase; full detail stays in `type` = "Middle (ages 3-19)") |
| Scotland `school_type` | direct: Primary / Special / Secondary |
| NI `type`: Primary school / Secondary (grammar|non-grammar) / Special school / Nursery school | Primary / Secondary / Special / Nursery |
| NI `type`: VP Pre-schools, Peripatetic (1 playgroup) | **Nursery** |
| NI `type`: Preparatory Schools (grammar prep depts) | **Primary** |

Wales has **no PRU equivalent** in the register (PRUs are part of the special sector list); Scotland/NI registers likewise. `phase` values remain within the existing 5 — no UI changes to phase filters needed.

### 2.3 Type / la / misc mapping
- `type`: use the nation's own string verbatim (Wales `type` + `governance`, Scotland `school_type` + `centre_type`, NI `type` + `management`) — keep provenance, don't force into England vocabulary. Suggested merged strings: Wales `"Community · Nursery, Infants & Juniors"`; NI `"Primary school · Controlled"`.
- `la`: verbatim (Wales 22 LAs, Scotland 32 LAs + `la_code` S120000xx available, NI: county (6) — NI's 11 local councils aren't in the register; `la = county` for now, flag in gaps).
- `postcode`: Wales **absent** (see §5 geocoding gap), Scotland/NI present.
- `mat`: null for all UK nations (no MAT concept outside England). NI `management` ≠ MAT — don't map.
- `admissions_policy`: null for all three (England-only concept; NI grammar selection is public knowledge but not in the CSVs — leave null, note in gaps).
- `ward`/`district`/`lsoa`: Scotland has `datazone` (S0101xxxx) + `uprn`; NI has `town`/`county`; Wales none. Map: Scotland `datazone → ward` slot? No — keep semantic honesty: store `datazone` in the Scotland layer, leave `ward/lsoa` null for all UK nations. `district` (postcode district) is derived from postcode at build time for Scotland/NI; Wales null until geocoded.
- `pupils`: Wales `pupils`, Scotland `pupil_roll`, NI `enrolment` (null where missing).

### 2.4 Proposed merged `School` shape (additive, England output unchanged)

```ts
type School = {
  urn: number | string;          // widened
  nation: "england" | "wales" | "scotland" | "ni";   // NEW
  name: string; slug: string;
  phase: "Nursery" | "Primary" | "Secondary" | "Special" | "PRU";
  type: string; la: string; postcode: string | null;
  lat: number | null; lng: number | null;
  pupils: number | null;
  ofsted: ... | null; ofsted_grade: string | null; ofsted_date: string | null;
  mat: string | null; admissions_policy: string | null;
  ward: string | null; district: string | null; lsoa: string | null;
  derived_ofsted: ... | null; derived_ofsted_source: "official"|"categories"|"report_card"|null;
  // NEW, nation-specific extras (kept out of England rows or null):
  language?: string | null;            // Wales: Welsh medium / Dual / English medium / N/A
  governance?: string | null;          // Wales
  management?: string | null;          // NI
  denomination?: string | null;        // Scotland
  datazone?: string | null;            // Scotland
  urban_rural?: string | null;         // Scotland (6-fold desc)
};
```

`postcode`, `lat`, `lng` must become nullable (Wales rows are null until geocoded; map filter skips null-coord schools with a count note).

---

## 3. Slug strategy

Reuse the exact England generator: `slugify(name, urn)` where the suffix is the **prefixed urn**:

```
"Ysgol Gynradd Amlwch" + "W-6602130" → "ysgol-gynradd-amlwch-W-6602130"
"Abbey Primary School" + "S-8212627-P" → "abbey-primary-school-S-8212627-P"
"174 Trust Playgroup" + "N-1AB0427" → "174-trust-playgroup-N-1AB0427"
```

- **Collision-proof:** the suffix differs from England's `-<int>` pattern by the letter prefix, and each prefixed urn is globally unique (§2.1). Wales' 8 duplicate names and Scotland's 146 duplicate names / 34 campus rows all resolve via the unique suffix. England slugs are untouched (England builder re-run produces byte-identical slugs).
- `slugs.json` gets `+5,479` entries appended by the UK builder (values = prefixed urn strings).
- `districts.json` gets new keys: Scotland/NI postcode districts (e.g. `ka13`, `bt14`, `eh7`) and Wales districts once geocoded (`cf10`, `ll57`, ...). **Append, never rewrite** — the England builder owns the base file.
- URLs: `/school/ysgol-gynradd-amlwch-W-6602130` — no route changes needed; `generateStaticParams` reads the merged schools.json.

---

## 4. Inspection equivalent (Ofsted fallback design)

### 4.1 Reality per nation
- **Wales — Estyn:** 4-point grades for schools: **Excellent / Good / Adequate / Unsatisfactory** (plus "Needs improvement"). Not downloaded yet (gaps).
- **Scotland — Education Scotland (HMIE successor):** since ~2016 **no headline grade**; narrative reports + (historically) per-theme "satisfactory/weak" judgements. Inspection index not parsed yet.
- **NI — ETI:** **narrative reports only**, no grades. Reports not parsed yet.

### 4.2 Principle
**Never map Estyn/HMIE/ETI grades onto the Ofsted 4-colour scale.** They are different frameworks; blending them would corrupt the league tables, area pages and the map legend, which are all Ofsted-semantics. Non-England schools show the **grey "No Ofsted" pin** with an honest label.

### 4.3 Concrete mechanism (Phase 1 — no inspection data)
- `ofsted`, `ofsted_grade`, `ofsted_date`, `derived_ofsted`, `derived_ofsted_source` → all `null` for Wales/Scotland/NI rows.
- `effectiveOfsted()` already returns `null` → grey pin `hsl(220,8%,55%)`, badge "Not judged". Zero UI code change for Phase 1 rendering.
- Add a `nation`-aware tooltip in the map legend + search rows + school page badge: label text becomes:
  - Wales: `"No Ofsted — inspected by Estyn"` 
  - Scotland: `"No Ofsted — inspected by HM Inspectors (Education Scotland)"`
  - NI: `"No Ofsted — inspected by ETI"`
  Implemented as one helper `inspectionBodyLabel(nation)` in `web/lib/utils.ts`; the legend's final row stays "Not judged / no data".

### 4.4 Phase 2 (when inspection data lands) — new `inspection` layer
Add an optional per-school `inspection` object in the merged record (not in `schools.json` — keep the flat list light):

```json
{ "inspection": {
    "body": "Estyn",
    "grade": "Good",
    "grade_scale": ["Excellent","Good","Adequate","Unsatisfactory"],
    "date": "2024-11-14",
    "report_url": "https://www.estyn.gov.wales/...",
    "source_label": "Estyn",
    "source_url": "https://www.estyn.gov.wales/"
}}
```

- Wales: 4-colour Estyn scale (distinct hues, e.g. teal/blue/amber/red) keyed on `inspection.grade` — implemented as new helpers `estynHsl()`/`estynToken()`, and the map circle expression gets a second `match` on `["get","nation"]` so England keeps Ofsted colours and Wales gets Estyn colours. **Never co-mingle: a pin is coloured by exactly one framework.**
- Scotland / NI: reports are narrative → keep grey pins, render the `inspection` card with report date + link + summary text on the school page. No colouring.
- School page: new "Inspection (Estyn/HMIE/ETI)" card section, shown only when `inspection` exists or `nation !== "england"` (with the "no data yet" empty state). Keep the existing Ofsted card England-only.

---

## 5. Data pipeline

### 5.1 New builder: `data/pipeline/build_national_webdata_uk.py` (parallel to England's builder, zero edits to it)

England's `build_national_webdata.py` stays the single owner of England per-school files. The new UK builder:

**Inputs** (all on disk or produced by one-time steps):
- `data/processed/uk_wales_schools.csv` (+ `uk_wales_schools_geo.csv` after geocoding — see §5.4)
- `data/processed/uk_scotland_schools.csv`, `uk_scotland_attainment.csv`, `uk_scotland_destinations.csv`
- `data/processed/uk_ni_schools.csv`, `uk_ni_performance.csv`
- reads (never writes) existing `web/public/data/schools.json` (for slug-collision check), `districts.json`, `slugs.json`, `meta.json`

**Outputs:**
1. `web/public/data/schools_uk.json` — the 5,479 UK-nation School entries (England shape per §2.4). A final merge step (documented in the deploy runbook, or a tiny `merge_uk_schools.py`) concatenates England's `schools.json` + `schools_uk.json` → `schools.json` (27,469 entries) and re-sorts by urn. Keeping them separate until the final merge makes the England builder trivially re-runnable.
2. `web/public/data/schools/<slug>.json` for each UK school — record shape:
   ```json
   {
     "school": { ...merged School, "nation": "wales" },
     "ofsted": null,
     "perf": { "scqf": {...} | "ni": {...} | null, "source_label": "...", "source_url": "..." },
     "chars": { "fsm_pct": 18.0, "aln_pct": 5.1, "language": "Welsh medium school / provision (including transitional)", "pupils_on_roll": 236, "year": 2026, "source_label": "StatsWales", "source_url": "https://api.stat.gov.wales" },
     "simd": { "dz_simd_percentile": 58, "most_deprived_15pct": false, "urban_rural_6_desc": "Other Urban Areas", "minority_ethnic_band": "5 - <10%", "fte_teacher": 15.4, "denomination": "Non-denominational", "datazone": "S01011295" },
     "inspection": null,
     "admissions": null, "crime": null, "prices": <district prices if present>, "flood": null,
     "data_as_of": "2026-08-10"
   }
   ```
   Keys `simd`/`inspection` are new and absent from England records (England builder untouched → England files unchanged; UK files simply have extra keys).
3. `districts.json` — read existing, **append** UK keys, write back (or write `districts_uk.json` and merge — prefer append-with-merge since area pages read the single file).
4. `slugs.json` — read existing, append UK slug→urn, write back.
5. `meta.json` — rewrite with `region: "United Kingdom"`, `schools: 27469`, add `by_nation: {england: 21990, wales: 1441, scotland: 2483, ni: 1555}`; keep `by_la`/`by_grade` England-scoped and add `by_la_uk` (or rename — decide in implementation; home page meta strip shows `meta.schools · meta.region` so it self-updates).

### 5.2 Layer mapping per nation (nation CSV columns → existing/new shapes)

| Nation | Layer key | Source CSV → shape |
|---|---|---|
| Wales | `chars` (reuse existing key) | `fsm_eligible → fsm_pct`, `aln_pupils → aln_pct` (NEW optional field on `Characteristics`), `language → language`, `pupils → pupils_on_roll`. Note: `fsm_eligible`/`aln_pupils` are percentages already (values like `18`, `20.8`) — parse float, leave null on blank. |
| Scotland | `simd` (NEW key) | `dz_simd_percentile`, `dz_simd_most_deprived_15pct` (Y/N), `urban_rural_6_desc`, `prop_minority_ethnic` (banded string, `*` = suppressed → null), `fte_teacher`, `denomination`, `datazone`. **Do not force into England's `Characteristics`** (different semantics; SIMD is area-based, not school census). |
| Scotland | `perf` (extend) | `uk_scotland_attainment.csv`: add optional `scqf` block — `{ avg_total_tariff, pct_5plus_scqf6, pct_1plus_scqf5, year }` (latest year only; CSV has one row/school). `uk_scotland_destinations.csv`: add `dest` block — `{ pct_positive_destination, year }` (**pick the latest academic year row per seed**; multiple years exist). Sparse cells → null. `source_label: "Scottish Government attainment statistics"`. |
| NI | `perf` (extend) | `uk_ni_performance.csv`: add `ni` block — `{ pct_5plus_gcse_ac, pct_5plus_gcse_ac_engmaths, pct_3plus_alevel_ac, year: 2025, source_label: "SAER 2024/25" }`. GCSE 5+ A\*-C ≠ England's Progress 8/Attainment 8 — **must never render in the England GCSE stat grid**; separate card section keyed on nation. Join by `ref`; 177 rows match, 9 unmatched → skip unmatched. |
| NI | `chars` (reuse) | `ptr → ptr` (NEW optional field), `enrolment → pupils_on_roll`. No FSM/SEN in NI CSV. |
| Wales | `perf` | **None** — no attainment CSV yet (gap). `perf: null`. |

### 5.3 Where each nation's extra data renders (school page, Phase 1)
- New **"Inspection"** card: all non-England nations (empty state or Estyn/HMIE/ETI data when it lands) — §4.
- New **"Attainment"** variants on the existing Exam results card, dispatched on `school.nation`:
  - `scotland` → SCQF tariff row + positive-destinations row (label "SCQF points" / "% in positive destination").
  - `ni` → "5+ GCSE A\*-C" / "incl. Eng & Maths" / "3+ A-level A-C".
  - `wales` → existing empty state.
- New **"Context"** card: Scotland SIMD + urban/rural + FTE teachers; Wales language + ALN%; NI PTR + management. (England unchanged.)
- All other cards (Admissions distance, Crime, Flood, Prices) already degrade gracefully via `null` — verified: crime is LSOA-keyed (England-only by design — **note in the UI**: "Crime data: England only"), flood is URN-keyed EA data (England-only; NI has its own flood service, SEPA covers Scotland — out of scope Phase 1), admissions is England-only. Prices: HM Land Registry covers **England & Wales** → Wales district pages will show sold prices once Wales postcodes exist; Scotland/NI show none.

### 5.4 Wales geocoding (blocker for map pins)
The Wales register CSV has **no postcode or address column** — postcodes.io cannot be used without an input. Steps:
1. **Acquire addresses:** Welsh Government publishes school contact details (gov.wales "School contact details" open data CSV; also stats.gov.wales register API). Expect `~1,441` rows with address + postcode. (One-off fetch, ~1–2 h incl. join on `ref`/name.)
2. **Geocode:** reuse the `geocode_national.py` pattern — postcodes.io bulk (covers Wales) with Nominatim fallback for misses (same pattern already used elsewhere in the repo), checkpoint JSON, append `lat/lng` (+ ward/district from postcodes.io's admin fields where present).
3. QA: expect ~95–99% hit rate; flag any misses for manual lookup.
Until this lands, Wales rows ship with `lat/lng/postcode: null` and are **excluded from the map + district pages but searchable** (name/LA search still works) with a visible count.

---

## 6. Map + search changes

- **Scale:** 27,469 pins. `schools.json` grows ~10.9 MB → ~13.5 MB; Fuse.js search over 27.5k items is still fine (index built once client-side). Recommend enabling **MapLibre geojson clustering** (`cluster: true, clusterRadius: 40` on the `schools` source, with a cluster circle + count layer under the existing circle layer) — 22k pins already stress mobile GPUs at low zoom; clustering is cheap insurance and keeps label layer legible.
- **Nation filter:** add 4 chips (`All · England · Wales · Scotland · NI`) to the filter panel (`school-map.tsx`). State `activeNations: Set<string>`; `filtered` gains `activeNations.size ? list.filter(s => activeNations.has(s.nation)) : list`. Clicking a single nation also `flyTo`s a representative center (Cardiff `[-3.18,51.48]`, Edinburgh `[-3.19,55.95]`, Belfast `[-5.93,54.6]`). Default: **All** (UK-wide coverage is the product differentiator vs Locrating's England bias).
- **Colour:** unchanged logic — non-England rows have `effectiveOfsted === null` → grey. Phase 2 (Estyn data): extend the circle `match` with a `["get","nation"]` branch per §4.4.
- **Search:** placeholder text becomes dynamic from `schools.length` ("Search 27,469 schools by name or postcode"). Fuse keys unchanged (name/postcode/ward); Wales rows match on name + LA (add `la` key with weight 0.1 — England rows unaffected).
- **Meta strip:** `meta.schools · meta.region` auto-updates to "27,469 schools · United Kingdom".
- **Districts/area pages:** new UK postcode-district keys flow through `districts.json` automatically; area page shows Wales prices where present; "Nearby districts" list gets UK neighbours. `districtLabel()` uppercase formatting works for all UK formats (`ka13` → `KA13`).

---

## 7. Step order (implementation sequence)

| # | Step | Files touched (impl phase) | Effort |
|---|---|---|---|
| 1 | Widen `urn` type + add `nation`; nullable lat/lng/postcode | `web/lib/utils.ts`, `web/app/page.tsx`, `compare/page.tsx`, `league-tables/page.tsx`, `school-map.tsx` | 0.5 d |
| 2 | Normalizer module: 3 nation CSVs → England-shaped School dicts (+prefix urn, phase map, dup-seed policy) | `data/pipeline/uk_nations_normalize.py` (new) | 1 d |
| 3 | Wales address acquisition + geocoding (postcodes.io + Nominatim fallback) | `data/pipeline/geocode_wales.py` (new, mirrors `geocode_national.py`) | 1–2 d |
| 4 | Layer builders: Scotland simd/attainment/destinations; NI perf; Wales chars | `data/pipeline/uk_nation_layers.py` (new) | 1 d |
| 5 | `build_national_webdata_uk.py`: per-school files + districts/slugs append + meta rewrite | new builder + merge step | 1 d |
| 6 | School page: nation-dispatched cards (Inspection / SCQF+dest / NI GCSE / Context) | `web/app/(content)/school/[slug]/page.tsx`, `web/lib/data.ts` (types) | 1–1.5 d |
| 7 | Map: clustering, nation chips, dynamic placeholder, legend label helper | `school-map.tsx`, `web/lib/utils.ts` | 1 d |
| 8 | Build + verify: `next build` (~28k pages), spot-check 1 school/nation, diff England slugs unchanged, CI deploy | — | 0.5 d |
| 9 | Phase 2 (optional): Estyn/HMIE/ETI inspection layer + Estyn 4-colour scale | new fetch scripts + `school-map.tsx` | 1–2 d each nation |

**Total Phase 1: ~6–8 engineer-days.**

---

## 8. Honest gaps per nation

### Wales
- **No postcodes/addresses/coords in any on-disk CSV** — map pins and district pages impossible until Welsh Gov contact-details dataset is fetched + geocoded (§5.4). *Effort: 1–2 d.*
- **No school-level attainment** (KS2/KS4-equivalent). StatsWales hosts it; the source notes already flag it. *Effort: 1–2 d (fetch + map to a `wales` perf block).*
- **Estyn inspection index not pulled** (grades exist and are mapped-ready per §4.4). *Effort: 1–2 d.*
- FSM missing for 102 schools, ALN for 217 (7%/15%) — render `—`, never 0.
- Middle schools (31) phase ambiguity — mapped to Primary with a flagged decision.
- Welsh-medium status is a strength (403 schools) — surfaced via `language` in Context card; consider a "Welsh medium" filter chip later.

### Scotland
- **Education Scotland inspection index not parsed** (JS-driven site; agent hit limits). No headline grades exist anyway → Phase 1 grey pins are honest; report links would still add value. *Effort: 1–2 d.*
- Attainment is **sparse** (many rows only `avg_total_tariff`; SCQF % cells blank) — render nulls as `—`.
- **34 campus duplicate SEEDs** need the merge policy in §2.1 (drop zero-roll Special dup rows, suffix the rest). 27 schools with roll 0 (e-Sgoil virtual school, closed-ish units) — keep with pupils 0 or exclude? Decide: keep, display 0.
- Destinations: multi-year rows — latest-year selection rule needed; note older years could seed a trend later.
- `*` suppression codes in minority-ethnic/deprivation bands → null.

### Northern Ireland
- **ETI reports not parsed** (staged HTML in `/tmp/ni_scratch/eti_*.html`). Narrative-only → link card, no grades. *Effort: 1–2 d.*
- 9 SAER schools have no register row (closed/renamed) — excluded from map, data preserved in layer.
- **No primary attainment** — SAER is post-primary only; primary schools show empty Exam results.
- Enrolment missing for all 548 pre-school/special/nursery/prep rows; PTR missing for 402.
- `la` = county (6), not the 11 actual councils — acceptable Phase 1, flag on page.

### Cross-nation (product-level)
- Crime (England LSOA), flood (EA England), admissions distance (England) are England-only by data availability — UI must say so rather than imply absence. Prices will cover Wales once geocoded (LRPP covers England+Wales) but not Scotland/NI (separate Registers of Scotland / LPS datasets — future).
- League tables & compare pages key on `perf[String(urn)]` — UK nations would **silently appear as "no data"** rows; Phase 1: filter league-tables/compare to `nation === "england"` explicitly (one-line guard) so the Ofsted/Progress-8 semantics stay clean; revisit when SCQF/SAER metrics get their own tables.
- SEO: 5,479 new static pages is fine, but `generateMetadata` description says "Ofsted: ..." for every school — swap to `inspectionBodyLabel(nation)` wording for non-England.

---

## 9. Open decisions for the implementer
1. Wales `Middle schools → Primary` (chosen) vs a new "All-through" phase (ripples through filters/reach defaults).
2. Single merged `schools.json` (chosen) vs per-nation files + client-side concat (worse for static export, no benefit).
3. `meta.json` shape: keep `by_la` England + add `by_la_uk` (chosen) vs single merged map.
4. Scotland campus rows: drop-zero-roll-special policy (chosen) — confirm against `schuid` semantics (P/S suffix already distinguishes).
5. Whether Phase 2 Estyn colours reuse the grey default or a new 4-hue scale — plan says new scale, never blended with Ofsted hues.
