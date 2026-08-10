# Transport Links + Broadband Speeds — Source Research & Pipeline Design

**Date:** 2026-08-10 · **Probed by:** subagent (real HTTP checks, curl with browser UA, follow redirects)
**Target:** attach 2 new layers to the 21,990-school England national register (`data/processed/national.db`, table `schools`: urn, postcode, lat, lng, lsoa, district, ward, constituency)

**Bottom line:** Both layers are buildable **entirely from free, no-key, OGL-licensed bulk open data**. NaPTAN gives every stop/station with lat/lng (nearest-stop computation is a local point-in-polygon-style STRtree job, same pattern as the EA flood runner). Ofcom Connected Nations 2025 publishes **postcode-level fixed coverage** and **output-area-level actual speeds** — both join cleanly to schools (99.6% postcode match in a 3,000-school sample; 21,947/21,990 have lat/lng).

---

## 1. TRANSPORT LAYER — NaPTAN (DfT)

### Verified source (live 2026-08-10)

| Item | Value |
|---|---|
| Data.gov.uk dataset | `https://www.gov.uk/government/publications/national-public-transport-access-node-schema` (also CKAN package `national-public-transport-access-nodes-naptan3`, updated 2026-06-26) |
| **Bulk download URL** | `https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv` |
| HTTP check | **200** (GET; HEAD returns 405 — use GET). Server `Kestrel`; rate limit headers `x-rate-limit-limit: 1h`, `x-rate-limit-remaining: 199` → **200 requests/hour**. One GET per run is fine. |
| Size / shape | 101,787,032 bytes (~102 MB CSV), **435,295 rows**, ~20 cols, header row |
| Format | Flat CSV, WGS84 lat/lng built in (`Longitude`,`Latitude` columns) — no geocoding needed |
| Licence | OGL (dataset `naptan` package shows "UK Open Government Licence (OGL)") |
| Coverage | England, Scotland, Wales (NOT Northern Ireland). Live API — no explicit cadence; DfT beta portal (`beta-naptan.dft.gov.uk`) publishes "Last updated" per region |
| Alt endpoints | XML: `?dataFormat=xml` · NPTG localities: `naptan.api.dft.gov.uk/v1/localities?dataFormat=csv` (for locality names if wanted) |

### Stop-type breakdown (from the actual 435k download)

| StopType | Meaning | Count | Use |
|---|---|---|---|
| BCT | Bus coach tram (all bus stops) | 416,536 | nearest bus stop |
| BCS | Bus coach station | 4,937 | (optional) |
| BCE/BCQ/BST | bus shelters etc. | 401 | (optional) |
| **RLY** | **Rail station** | **2,715** | **nearest rail station** |
| MET | Metro/Underground | 987 | London/Newcastle metro |
| PLT | Platform (subset of RLY/MET) | 1,633 | skip (dup of RLY) |
| TXR | Taxi rank | 853 | optional |
| FER | Ferry terminal | 505 | optional |
| AIR | Airport | 70 | optional |
| TMU | Tram | 1,520 | optional |
| **active** status | — | **387,828** | **filter `Status==active` (47,466 inactive)** |
| total | — | 435,295 | |

Rail sample verified: `Aberdare Rail Station 51.7151,-3.4431`, `Ashley Down 51.47875,-2.5767` — lat/lng present and sane. Note `RLY` covers England+Scotland+Wales (~2,500 stations), which is **more than National Rail's GB list** because it includes heritage/light rail — fine for a "nearest station" layer.

### Rejected/alternative transport sources (all probed)

| Source | Result | Verdict |
|---|---|---|
| transportAPI.com v3 | **403** `Authorisation failed ... application_not_found` with no key | needs app_id/key — reject |
| National Rail opendata (opendata.nationalrail.co.uk) | 200, but portal is a **login wall** ("Register for access" → free key, email case-sensitive) | key needed; only adds timetables/live trains — not needed for proximity layer |
| TfL API | **200** no key (`https://api.tfl.gov.uk/StopPoint?lat=..&lon=..&radius=1000&stopTypes=NaptanPublicBusCoachTram&modes=bus` returned 106 stopPoints) | London-only; NaPTAN already covers London — skip |
| Network Rail / other station APIs | key-walled | skip |

### Pipeline design (Transport)

```
1. GET https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv   (~102 MB, 1 req/hour budget — keep the raw file)
2. Filter Status==active (387,828 rows); keep ATCOCode, NaptanCode, CommonName, Street, Town,
   LocalityName, StopType, Longitude, Latitude, AdministrativeAreaCode
3. Build two STRtrees (shapely) — one over active bus-ish stops (BCT+BCS+BCE+BCQ+BST),
   one over rail (RLY + MET as "rail/metro" tier, or RLY only for strict rail)
4. For each of 21,990 schools (lat/lng; 43 without lat — output null):
     nearest_bus_stop:    STRtree query → min haversine distance (m) + stop name + NaptanCode
     nearest_rail:        STRtree query over RLY → distance (m) + station name + NaptanCode
     (optionally nearest_metro, nearest_tram)
   Same prepared-geometry / haversine approach as flood runner — ~2 min national run, no reprojection needed (both WGS84).
5. Output JSON per school (web shape below). Optionally also a raw stops.json.gz for map pins.
```

Runtime: ~435k stops in a STRtree is trivial (the flood runner handled 231k polygons). Expect the nearest-neighbour pass over 22k points to take seconds-to-a-couple-minutes.

### Coverage estimates (Transport)

- 21,947/21,990 schools have lat/lng → 99.8% get both nearest stop + nearest station. 43 schools (0.2%) null (no geocode — same set as flood layer).
- Every English school will find a rail station within a practical radius — England has ~2,500 RLY points; median nearest-station distance will be a few km; outliers (rural) 10–20 km — fine for display.
- NaPTAN is the *same* dataset Locrating-class tools use for transport proximity; no licence cost, OGL reuse allowed with attribution.

### Pitfalls (Transport)

- **HEAD 405, GET 200** — don't HEAD-probe in CI; GET and stream to disk.
- **Rate limit 200/hour** — one download per build; never re-download in a loop. Cache raw file.
- **47k inactive stops** — filter `Status==active` or you'll attach closed stops as "nearest".
- **PLT (platform) rows duplicate RLY/MET** — use RLY/MET only.
- NaPTAN is GB, not NI — consistent with our England-only register; note it if we ever add NI.
- Stop coordinates are the stop point, not the station building — "nearest rail" distance is stop-accurate, which is actually what parents walk to.

---

## 2. BROADBAND LAYER — Ofcom Connected Nations 2025

### Discovery path (live 2026-08-10)

Old paths are dead: `ofcom.org.uk/research-and-data/.../connected-nations-2025` → **301** to `/phones-and-broadband/coverage-and-speeds/connected-nations-20252` → **404**. The **live index** is:

`https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/infrastructure-research` (**HTTP 200**) → link `connected-nations-20252/data-downloads-2025` (**HTTP 200**, JS-rendered table; "Published: 19 November 2025").

### Verified download URLs (all HTTP 200, browser UA needed for some)

| Dataset | URL (2025 vintage, published 2025-11-16) | Size | Granularity |
|---|---|---|---|
| **Fixed coverage + full-fibre take-up** | `https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/infrastructure-research/connected-nations-2025/202507_fixed_broadband_coverage_r01.zip?v=407830` | 34.6 MB zip | **postcode** (nested zip), OA, LAUA, PCON, devcon, UK/nations |
| **Fixed performance** (actual speeds) | `https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/infrastructure-research/connected-nations-2025/202507_fixed_broadband_performance_r01.zip?v=407839` | 3.7 MB zip | **OA**, LAUA, PCON, devcon (NO postcode level) |
| Mobile coverage | `https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/infrastructure-research/connected-nations-2025/202507_mobile_coverage_r01.zip?v=407840` | — | LAUA etc. (not needed for this layer) |

(URLs carry `?v=` query params — keep them. The data.gov.uk CKAN package `infrastructure-report` mirrors older vintages — postcode-level zips exist for 2015/2016/2017/2018 but **NOT** for 2019+; current years live only on ofcom.org.uk.)

### What's inside (verified by unpacking)

**Postcode-level coverage** (`202507_fixed_pc_coverage_r01.zip`, 27 MB zip → 245 files, 326 MB unzipped): split by postcode area (`postcode_files/202507_fixed_pc_coverage_r01_<AREA>.csv` + `postcode_res_files/..._res_...` = residential-only variant). Columns (exact):

```
postcode, postcode_space, postcode area,
% of premises with 30<300Mbit/s download speed, % of premises with >=300Mbit/s download speed,
% of premises with 0<2Mbit/s, 2<5Mbit/s, 5<10Mbit/s, 10<30Mbit/s,
SFBB availability (% premises), UFBB (100Mbit/s) availability (% premises), UFBB availability (% premises),
% of premises unable to receive 2Mbit/s / 5 / 10 / 30, Gigabit availability (% premises),
% of premises below the USO, % of premises with NGA, % of premises able to receive decent broadband from FWA
```

**Performance (actual speeds)** — output-area level (`202507_fixed_performance_oa_r01.csv`, 12.3 MB, cp1252-encoded): `output_area` (OACD like E00000001) + avg max download/upload speed per speed-band (`Average max download speed (Mbit/s) for lines <10Mbit/s`, `10<30`, `30<100`, `100<300`, `300<900`, `>=900`) + uploads. **No postcode-level performance exists in 2025** — OA is the finest for real speeds.

Also available: `laua` (LA-code keyed, joins via schools.district GSS code — handy fallback), `pcon`, `devcon`.

### Join keys (verified against our data)

- **Coverage → postcode**: school postcodes are stored with space (`EC3A 5DE`, 21,990/21,990). Ofcom uses `postcode_space` (`BS10 5AA`) + spaceless `postcode` (`BS105AA`). Normalise school postcode: uppercase, strip spaces → join on `postcode` column. **Sample of 3,000 random school postcodes: 2,964 matched = 99.6%.** All 101 school postcode areas are present in the 122 area files. Missing 0.4% = new/rare postcodes (school opened after Nov 2025 data cut, or postcode geocoding quirk) → leave null.
- **Performance → OA**: schools do NOT carry an OA code. Two options: (a) reverse-geocode 21,947 school lat/lng → OACD via postcodes.io `POST /postcodes` with `geolocations` (100/call, ~220 calls — proven pattern from crime layer), or (b) accept LSOA-level proxy (schools have `lsoa`; OA → LSOA mapping is a 10:1 roll-up, but LSOA is not in the performance file — you'd need the OA→LSOA lookup, which is another download). Recommend (a): OACD per school from postcodes.io reverse geocode, join directly.

### Coverage estimates (Broadband)

- **Coverage (postcode)**: ~99.6% of 21,990 schools (21,9xx schools) — the flagship "does this school's postcode have gigabit / superfast / USO-level service" card.
- **Performance (OA)**: ~99.8% (same 21,947 geocoded set, minus OA reverse-geocode misses) — "typical download speed in the area around the school".
- Data vintage: **July 2025 measurements, published 19 Nov 2025** — the freshest annual cut. Annual cadence (next release ~Nov 2026). Older vintages available from the same `siteassets/.../connected-nations-<year>` pattern if we ever want a time series.
- Licence: Ofcom "About this data" pages accompany each file; data is published for reuse (UK Open Government/Ofcom terms — same class as the other layers; cite "Ofcom Connected Nations 2025, July 2025 data").

### Pitfalls (Broadband)

- **Coverage is premises-%, not a speed promise** — a postcode with `Gigabit availability 100%` means every *premise* can order it, not that the school's line is gigabit. Display as "X% of premises in [postcode] can get gigabit" — honest framing matters (Locrating shows the same caveat).
- **Performance is per speed-band averages, not a headline** — derive a headline as weighted mean, or show the band averages; don't invent a single "average speed at this postcode" figure that Ofcom doesn't publish.
- **Split-by-area files**: 122 area CSVs (245 with res variant) — stream-read only the areas your school postcodes need (101), or concatenate. 326 MB unzipped total; keep zipped and read via `zipfile`.
- **cp1252 encoding** in the performance OA CSV (0xf4 byte hit) — open with `encoding='cp1252'` (same as DfE/Ofsted CSVs, skill pitfall 9).
- **`?v=` cache-busting params** on ofcom.org.uk URLs — they change per release; re-scrape the `data-downloads-2025` page annually rather than hard-coding.
- **Site restructure**: research-and-data paths 301→404; use the `phones-and-broadband/coverage-and-speeds` path from this doc. The downloads page is JS-rendered — grep `<main> a` hrefs via browser/console, or fetch with a JS-capable client; curl alone gets no asset links (the page is a static shell + client-side table).
- **Thinkbroadband is 403 from this network** (both `/data/exchange` and homepage) — commercial/Cloudflare-gated; not needed since Ofcom postcode data supersedes per-exchange estimates for this use case. Reject as a runtime dependency (skill pitfall 7: never proxy in production).

---

## 3. RECOMMENDED PIPELINE SUMMARY

### Layer A — Transport (`transport.json` per-school shape)

```json
{
  "urn": 100000,
  "nearest_bus_stop": {"name": "Temple Meads Stn", "atco": "0100BRP90317", "distance_m": 320.5},
  "nearest_rail":     {"name": "Bristol Temple Meads", "atco": "0100BRP90317", "distance_m": 250.1},
  "nearest_metro":    null
}
```
- Steps: download NaPTAN CSV (1 GET) → filter active → STRtree over bus stops / rail stops → per-school 2 nearest-neighbour queries (haversine) → write `web/public/data/transport.json` (urn-keyed) + optional `stops.json.gz`.
- ETA: ~102 MB download + ~2–3 min compute on the 8 GB Mac (proven pattern: flood runner).
- Also useful later (free): join each stop's `NptgLocalityCode` to NPTG for locality labels; TfL stops are included so London works with zero extra work.

### Layer B — Broadband (`broadband.json` per-school shape)

```json
{
  "urn": 100000,
  "vintage": "2025-07 (CN2025, pub 2025-11-19)",
  "postcode_coverage": {
    "postcode": "BS10 5AA",
    "gigabit_pct": 100.0, "ufbb_pct": 100.0, "sfbb_pct": 100.0,
    "pct_unable_30": 0.0, "pct_below_uso": 0.0,
    "pct_300_plus": 100.0, "pct_30_300": 0.0
  },
  "oa_performance": {
    "oacd": "E00000000",
    "avg_dl_lt10": null, "avg_dl_10_30": 19.8, "avg_dl_30_100": 69.0,
    "avg_dl_100_300": 161.0, "avg_dl_300_900": 514.0, "avg_dl_ge900": 915.0
  },
  "laua_fallback": {"gss": "E06000023", "gigabit_pct": 88.1}
}
```
- Steps: download coverage zip (34.6 MB) + performance zip (3.7 MB) → stream-read postcode files for the 101 needed areas, join on spaceless postcode → reverse-geocode 21,947 school points via postcodes.io (220 POSTs, checkpointed) to OACD → join OA performance → (fallback) join LAUA performance on `district` GSS code → write `web/public/data/broadband.json`.
- ETA: ~1 h wall (mostly postcodes.io reverse geocode at ~0.5s/call × 220 calls, parallelizable).

### Both layers — web integration notes
- Follow the existing pattern: URN-keyed JSON in `web/public/data/`, school page joins on `urn` (pitfall 13: after any schema change, diff export fields vs DB and regenerate; add join-coverage counts to QA, e.g. "schools with broadband: 21,900/21,990").
- Label every value with its vintage/geo-granularity in the UI ("Ofcom CN 2025 (Jul 2025 data)", "nearest stop via NaPTAN, Aug 2026") — provenance is a feature (skill Pattern 3).
- Both sources are OGL/Ofcom-reuse licensed → attribution line in footer/source page.

---

## 4. VERIFIED URL / STATUS CHEAT-SHEET (2026-08-10)

| URL | Status |
|---|---|
| `https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv` | **200** (GET; HEAD=405) |
| `https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=xml` | 200 (same API) |
| `https://beta-naptan.dft.gov.uk/` | 200 |
| `https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/infrastructure-research` | **200** (live index) |
| `https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/connected-nations-20252/data-downloads-2025` | **200** (JS-rendered; grep `<main> a`) |
| `.../202507_fixed_broadband_coverage_r01.zip?v=407830` | **200** (34.6 MB) |
| `.../202507_fixed_broadband_performance_r01.zip?v=407839` | **200** (3.7 MB) |
| `.../202507_mobile_coverage_r01.zip?v=407840` | **200** |
| `http://www.ofcom.org.uk/static/research/ir/Fixed_postcode.zip` (legacy 2017-era) | 200 via `https://static.ofcom.org.uk/...` — do NOT use (superseded) |
| `https://api.tfl.gov.uk/StopPoint?...` | **200** no key (London only) |
| `https://opendata.nationalrail.co.uk/` | 200 but login-gated (free key) — not needed |
| `https://transportapi.com/v3/...` | **403** without app_id/key — reject |
| `https://www.thinkbroadband.com/data/exchange` | **403** — reject (commercial) |

Scratch artifacts (can be deleted): `/tmp/tbb_research/` — `naptan_sample.csv` (102 MB), `ofcom_2025_fixed.zip`, `ofcom_2025_perf.zip`, nested pc/oa zips, probe JSONs/HTMLs.
