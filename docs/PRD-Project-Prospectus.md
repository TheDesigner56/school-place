# Product Requirements Document — Project Prospectus

**A free, honest UK schools, catchment and neighbourhood intelligence product**
Strategic working document · 1 August 2026 · Prepared for Gid D
Status: Draft v1 · Classification: Internal strategy

---

## 1. Context — why this product, why now

### 1.1 The strategic frame

This product is the first owned asset under the Digital-Asset Studio Plan (July 2026). That plan's thesis: find neglected digital utilities with real demand, improve the product and distribution, monetise, and build a portfolio of owned cash-flowing assets. The reference case is bustimes.org — a one-person business earning an estimated £250k–£800k/yr by normalising messy public data into a utility people return to.

Project Prospectus fits the asset-selection framework from the plan:

| Dimension | Assessment |
|---|---|
| Demand | Millions of UK parents research schools annually; "school catchment" queries are high-volume and recurring |
| Pain | A wrong school decision costs a house move, a child's education, or both — among the highest-stakes consumer decisions that exist |
| Data | Almost entirely public (DfE, Ofsted, ONS, Police.uk, Land Registry, EA) but fragmented and badly presented |
| Monetisation | Lead generation (conveyancing, mortgages, removals, broadband), advertising, later B2B data products |
| Distribution | SEO long-tail: every school, postcode, town and catchment query is an indexable page |
| Operating leverage | Data pipelines automatable; one-person operable |
| Defensibility | Normalised dataset + brand trust + distribution compound over time |
| Saleability | Clean, transferable, owner-independent by design |

### 1.2 The incumbent and the opening

Locrating (locrating.com) is the market leader: a family-run business operating since 2010, charging £12.99–£14.99/month or £41.99/quarter for premium data. It is genuinely used and liked (≈4.5★ Trustpilot, ~590 reviews).

Its weaknesses, confirmed by research (30 July–1 Aug 2026):

1. **Legacy technology.** ASP.NET WebForms (.aspx throughout). Dated UX, aggressive Cloudflare blocking, no design ambition.
2. **Paywall friction.** The most valuable data (catchment indicators, pupil heat maps, flood, noise) is locked behind "Unlock Data."
3. **False precision.** Catchment estimates presented as confident boundaries. Users have noticed: *"Locrating shows absolute rubbish for our school catchment… they just scrape cut-off distance data from local authority websites… crow-flies rather than walking distance"* (Mumsnet).
4. **Strategic fear of free.** Their pricing page argues unprompted: *"Don't be fooled by free sites… free and AI generated sites are a false economy."* Incumbents do not attack threats that do not exist.

### 1.3 The insight that defines the product

**Most English state schools have no fixed catchment area.** Oversubscription criteria (post-Admissions Code, and academies are their own admission authorities) are typically: looked-after children → siblings → **distance**. The "catchment" is an emergent outcome — the last distance offered in a given year — and it moves annually with birth cohorts, sibling clusters, new housing and school popularity.

Therefore *no one* can guarantee catchment coverage — including the incumbent. The market is selling false certainty. The opening is not to out-scrape Locrating; it is to **change the game from fake boundaries to honest probability**.

The product principle, stated as a design law:

> **Estimation is a service. False precision is a lie.**

We show estimates — clearly labelled, source-dated, with visible confidence. They sell "this is it." We show the odds.

### 1.4 Why we win

- **Design as strategy.** A best-in-class, map-first, mobile-first product against a 15-year-old WebForms interface is not a fair fight. Design craft is the founder's unfair advantage and the product's primary weapon.
- **Free vs £13/month.** Everything of theirs that derives from public data, we give away.
- **Glass box vs black box.** Every figure cited, sourced and dated. Trust is the brand.
- **Speed.** Static-first rendering, sub-second pages, versus a legacy stack behind a WAF.
- **SEO architecture.** Programmatic, indexable pages for every school, postcode, town and comparison query.

---

## 2. Problem statement and users

**Primary user:** a parent (or guardian) relocating within the UK, or choosing schools for an upcoming admissions round, trying to answer: *"If we live at this address, what school will my child realistically get into — and is the area somewhere we want to live?"*

Secondary users: renters evaluating areas; buyers without children assessing neighbourhood quality; property researchers; (later) estate agents and relocation agents as B2B consumers of the same data.

**Jobs to be done:**
1. Find good schools near a candidate area.
2. Understand the realistic chance of admission from a specific address.
3. Compare candidate areas/schools side by side.
4. Sanity-check neighbourhood quality: safety, prices, flood risk, transport, amenities.
5. (Later) Monitor a shortlist and be alerted when data changes (new Ofsted, new admissions round, new cut-off).

---

## 3. Product vision and principles

**Vision statement:**
The most trusted way to choose where to live and where your children learn — free, beautiful, and honest about what the data can and cannot tell you.

**Product principles:**

1. **Probability, not boundaries.** We model admission likelihood; we never draw a fake hard line.
2. **Glass box.** Every data point carries source and date. Methodology is public.
3. **Mobile-first, map-first.** The core experience works one-handed on a phone.
4. **Stunning is the strategy.** The design quality is the moat, the marketing, and the proof of craft.
5. **Fast is a feature.** Sub-second interaction; static-first architecture.
6. **Free forever for parents.** Revenue comes from the audience's commercial intent, never from locking their data.
7. **Uncertainty, shown well, is more useful than certainty, faked well.** "You're on the edge — here's your realistic backup" beats "you're in the catchment."

---

## 4. Competitive landscape

| Competitor | Model | Strengths | Weaknesses |
|---|---|---|---|
| **Locrating** | Freemium (£12.99/mo) | 15yr data accumulation, brand, B2B plugin, extension | Legacy stack, paywall, false precision, dated UX |
| **SchoolGuide.co.uk** | Ad-supported | Established SEO, school pages | Cluttered, ad-heavy, weak catchment tooling |
| **Snobe.co.uk** | Freemium | Modern-ish, admissions focus | Thin data depth, low brand awareness |
| **Good Schools Guide** | Paid editorial (££) | Trusted editorial reviews | Paywalled, not data/map-first, elite skew |
| **gov.uk Compare School Performance** | Free official | Authoritative results data | Brutal UX, no catchment, no neighbourhood, no map |
| **Rightmove/Zoopla school tabs** | Listings-first | Distribution | School data is a shallow checkbox feature |

**Positioning:** the design-led, free, honest-probability entrant. Not "another school table site" — the first product in the category that treats parents like adults.

---

## 5. Scope and phasing

### Phase 0 — Validation (Weeks 1–2) — *complete/in progress*
- Data supply probe: 9/10 sources verified live (see §7). GIAS reachable via Compare School Performance mirror; direct egress blocked from test network — pipeline to use proxy/browser fetch.
- Remaining: SEO keyword volume study; 5 parent interviews; LA admissions publication sampling (3 LAs).

### Phase 1 — MVP (Weeks 3–6) — Pilot region: Bath & NE Somerset + Bristol
Single region, national-quality execution. Goal: prove the experience and the data pipeline, not coverage.
- Map-first school search (nursery, primary, secondary, independent)
- School pages: Ofsted, results history, admissions data, pupil profile, contact
- Neighbourhood layers: crime, sold prices, deprivation, flood, transport stops
- Catchment v1: historical last-distance-offered display with honest labelling ("Typical offer zone — estimated from N years of admissions")
- Source-and-date stamping on every data point (glass box v1)
- Programmatic pages live for pilot region (schools, postcodes, towns)
- Design system v1 (tokens, components, map styles)

### Phase 2 — National v1 (Weeks 7–14)
- National data pipeline: ingest, normalise, schedule, monitor (all sources §7)
- Programmatic SEO at scale (~25k school pages, ~30k postcode-district/town pages)
- **Admission Likelihood Engine v1** (§6.3)
- Comparison tool (up to 4 schools/areas side by side)
- Lead-gen monetisation test (one affiliate vertical: conveyancing or broadband)
- Performance/SEO hardening; schema.org markup; sitemaps

### Phase 3 — v2 (Months 4–6)
- Browser extension (Manifest V3): overlay Prospectus data on Rightmove/Zoopla/OnTheMarket listing pages — the flanking move that neutralises Locrating's extension without a listings licence
- Accounts: saved addresses, shortlists, alerts (new Ofsted result, new admissions round, cut-off movement)
- Probability backtesting dashboard (our accuracy, published — the glass box applied to ourselves)
- Monetisation scale-up: removals, mortgage, broadband; tasteful display ads
- Month-6 portfolio decision per the Studio Plan: **kill / maintain / double down**

### Explicitly out of scope (v1)
- Property listings aggregation (licensing wall; the extension solves user-side)
- Parent reviews/UGC (cold-start trap; revisit month 6+)
- B2B estate-agent plugin (Phase 4+; consumer traction first)
- Scotland/Wales/NI admissions nuance beyond data display (England-first methodology)

---

## 6. Feature requirements

### 6.1 Core experience
- **Search:** postcode, town, school name, "near me"; instant, typo-tolerant
- **Map:** MapLibre GL; school pins with rating/phase encoding; layer toggles (crime, prices, flood, deprivation, transport); the signature **confidence gradient** overlay for admission zones
- **School page:** identity (phase, type, faith, academy trust), Ofsted history + report link, results trend (KS2/GCSE/A-level as applicable), admissions (places, applications, oversubscription ratio, last-distance history), pupil profile, sibling/feeder info, neighbourhood panel, similar schools
- **Area page (postcode/town):** schools summary, price trends, crime profile, flood risk, deprivation context, transport
- **Comparison:** side-by-side across any metrics; shareable URL
- **Report:** "Generate report" equivalent — a beautiful, printable area/school brief (free; our answer to their locked feature)

### 6.2 The honest catchment (v1)
- Display historical last-distance-offered per school across available years as a **volatility band**, not a boundary line
- Label every admission-zone visual: *"Estimated from N years of admissions data (20XX–20XX). Source: [LA allocation statement / DfE / FOI]. Catchments move annually — this is a guide, not a guarantee."*
- Distinguish and display criteria type per school: defined catchment / distance-based / faith / feeder / banding — with the actual policy text attached
- Straight-line and walking-route distances both shown and labelled (the incumbent's documented failure)
- Confidence chip per school: High / Medium / Low, derived from years of data, volatility, criteria type

### 6.3 Admission Likelihood Engine (v1.5)
Per address × school: a probability band with stated confidence.
- **Inputs:** last-distance history (trend + volatility), criteria type, oversubscription ratio, birth-cohort pressure (ONS births by LSOA, 4–5yr forward visibility), housing-development pipeline (planning data), distance from school (both modes)
- **Output:** "Strong chance / Likely / Borderline / Unlikely" with the reasoning shown in plain English — never a naked score
- **Backtesting:** score engine predictions against known historical outcomes; publish accuracy. The glass box applies to ourselves.
- **Principle:** we sell calibrated honesty. A 60% that means 60%.

### 6.4 Browser extension (v2)
- Overlay school/admission/neighbourhood data on Rightmove, Zoopla, OnTheMarket listing pages
- User-side rendering; no listings feed licence required (same mechanism as Locrating's extension)
- Manifest V3; React; shared design system; Chrome first, Firefox/Safari after

### 6.5 Monetisation surfaces (Phase 2+)
- Contextual lead-gen modules: conveyancing quotes, mortgage check, removals, broadband — placed at high-intent moments (area page, report, shortlist)
- Display advertising: tasteful, capped density, never on school data itself
- (Later, Phase 4) B2B: estate-agent data widgets; API access to the normalised dataset
- Never: locking parent-facing school/catchment data behind payment

---

## 7. Data sources and pipeline

All sources probed 1 August 2026. Licence: Open Government Licence unless noted.

| Source | Provides | Status (1 Aug 2026) |
|---|---|---|
| DfE Get Information About Schools (GIAS) | Full school register: identity, type, phase, trust, contacts | Service live; direct egress blocked from test network — fetch via proxy/browser; mirrored in CSP downloads |
| DfE Compare School Performance downloads | KS2/GCSE/A-level results, pupil profile, absence | ✅ HTTP 200 verified |
| Ofsted official statistics (maintained schools & academies inspections and outcomes collection) | Inspection outcomes history | ✅ HTTP 200 verified (note: Ofsted transitioning from single-word grades to report cards — pipeline must handle both eras) |
| Police.uk API | Street-level crime | ✅ JSON verified |
| Postcodes.io | Geocoding, admin geography, LSOA lookup | ✅ JSON verified |
| Environment Agency Flood Monitoring API | Flood warnings/areas (OGL confirmed in payload) | ✅ JSON verified |
| Land Registry Price Paid | Every residential sale since 1995 | ✅ verified |
| NOMIS API (ONS) | Birth registrations by area (forward demand modelling), census | ✅ API verified |
| NaPTAN (DfT) | All UK transport stops | ✅ verified |
| LA allocation statements / school admissions booklets | Last-distance-offered, places, applications | Public but fragmented; quality varies by LA; FOI fills gaps (WhatDoTheyKnow corpus exists; browser-only access) |
| Ofcom Connected Nations | Broadband speeds by postcode | Public download (not re-probed) |
| Planning portals / Glenigan-style aggregates | New housing pipeline | Fragmented; Phase 3 concern |

**Pipeline architecture:** Python ingestion jobs (scheduled, per-source) → raw store → normalisation layer → PostGIS (Supabase or Neon) → static JSON/API generation for frontend. Per-source freshness monitors; failed-source alerts. Data is versioned so every figure on the site can carry "as of" provenance.

---

## 8. Architecture and stack

- **Frontend:** Next.js (App Router, RSC), TypeScript, Tailwind CSS + shadcn/ui, static-first with ISR
- **Map:** MapLibre GL + OpenFreeMap tiles (no Mapbox bill; self-host option at scale)
- **Data:** PostgreSQL/PostGIS (Supabase or Neon); Python pipelines (scheduled); Redis/Upstash if needed
- **Search:** Postgres FTS initially; Typesense when volume demands
- **Hosting:** Vercel (frontend) + Cloudflare (DNS/CDN) + Supabase/Neon (data). Estimated infra cost: **£0–100/month** through year one
- **Extension (v2):** Manifest V3, React, shared tokens/components
- **Analytics:** privacy-respecting (Plausible/Umami) + Search Console; no dark patterns

---

## 9. Design direction

The product must look like the future of the category, not a better version of the past.

**Direction:** calm, typography-led data design; Linear/Stripe-grade restraint applied to public information. Light-first theme (parent demographic = trust, print-friendly) with a first-class dark mode from day one — both driven by one token system. Mobile-first; the map is the home screen.

**Signature elements:**
- **The confidence gradient** — admission zones rendered as fading probability washes, never hard polygons. The visual language *is* the brand.
- **Glass-box provenance** — source + date chips on every figure; methodology pages linked inline
- **Data typography** — tabular numerals, honest empty states, trend sparklines everywhere
- **Motion discipline** — motion communicates state change and causality only (per the fintech-plan motion principles); nothing playful near a high-stakes decision
- **Design system as artifact** — tokens, components and map styles documented publicly; the system itself is portfolio evidence of the founder's craft (feeds the distribution goal of the Studio Plan)

Accessibility: WCAG 2.2 AA target; reduced-motion variants; the confidence gradient must also be readable in pattern/label form.

---

## 10. SEO and distribution

- **Programmatic pages:** every school (~25k), postcode district, town, and "best schools in X" comparison — indexable, sub-second, schema.org (School, Place, FAQPage) markup
- **Long-tail thesis:** "school name + admissions", "postcode + schools", "town + catchment" — the bustimes pattern applied to education
- **Content:** methodology essays, catchment-myth explainers, annual "state of admissions" data reports — distribution that reinforces the honesty brand (per Studio Plan: content as distribution, not product)
- **Communities:** Mumsnet, Reddit (r/UKParenting), Facebook relocation groups — the founder answers questions with data, never spams
- **Realistic expectation:** 12–18 months to meaningful organic volume against a 15-year domain. Engagement-quality and long-tail coverage are the wedge.

---

## 11. Monetisation economics

Audience = people actively moving house — among the highest-intent lead-gen audiences in the UK.

| Channel | Indicative value | When |
|---|---|---|
| Conveyancing leads | £10–30/lead | Phase 2 test |
| Broadband switching CPA | £30–60/signup | Phase 2 test |
| Removals quotes | £5–15/lead | Phase 3 |
| Mortgage leads | £20–80/lead | Phase 3 |
| Display ads | £5–15 RPM | Phase 3 |
| B2B widgets/API | Contract | Phase 4 |

**Conservative model:** 100k monthly users → £3–8k/month blended. This asset is **year-2–3 money, not debt-clearance money** — the Studio Plan's separate cash engine remains responsible for near-term income. Do not confuse the two.

---

## 12. Metrics and kill criteria

**North-star metric:** weekly users who view an admission-likelihood or area report (the trust moments).

Supporting metrics: organic sessions, pages/session, report generations, extension installs (v2), lead CTR, affiliate EPC, pipeline freshness SLA adherence.

**Month-6 decision gate (per Studio Plan — kill / maintain / double down):**
- Kill if: <15k monthly organic sessions AND no monetisation signal AND pipeline maintenance exceeds sustainable effort
- Double down if: >50k monthly sessions with growing long-tail spread, first £1k+/month revenue, extension traction
- Between: maintain on minimum effort, reassess at month 9

---

## 13. Roadmap summary

| Period | Objective | Exit criteria |
|---|---|---|
| Weeks 1–2 | Validate | Data probe ✅; SEO study; 5 parent interviews; 3 LA admissions sampled |
| Weeks 3–6 | MVP (Bath & Bristol) | Pilot region live end-to-end; design system v1; first organic impressions |
| Weeks 7–14 | National v1 | Full pipeline; ~25k school pages; Likelihood Engine v1; first lead revenue |
| Months 4–6 | v2 | Extension live; accounts/alerts; backtest published; month-6 decision |
| Months 7–12 | Grow the winner (if doubled down) | 100k+ monthly users; £3k+/month; second-asset thesis begins |

---

## 14. Open questions

1. SEO keyword volumes — validate "catchment" long-tail demand quantitatively (Week 1)
2. LA admissions sampling — how bad is fragmentation really? (Week 1–2; 3 LAs)
3. Ofsted report-card transition — exact data shape going forward (Week 2)
4. Naming + domain availability (Week 2; separate pass)
5. Extension overlay legality/ToS posture — legal read before v2 build (Month 3)
6. Founder bandwidth against Treasure Spring commitments — weekly hour budget agreed in advance (ongoing; see Red Team R5)

---

*This document pairs with the Red Team analysis: "Project Prospectus — Red Team & Pre-Mortem." Read both before committing build effort.*
