# Red Team & Pre-Mortem — Project Prospectus

**An adversarial analysis of the plan to build a free Locrating competitor**
Strategic working document · 1 August 2026 · Prepared for Gid D
Status: Draft v1 · Pairs with: PRD — Project Prospectus

---

## 0. Purpose

This document attacks the thesis before the market does. The PRD argues the case for building; this document argues the case against, quantifies the risks, and defines the conditions under which we walk away. Per the Studio Plan: *an attractive concept that fails distribution or monetisation is not an opportunity; it is entertainment.*

Every risk is scored: **Likelihood** (L) and **Impact** (I) — High / Medium / Low — with mitigation and an explicit kill signal.

---

## 1. The kill shots

### R1 — The catchment grind trap
**L: High · I: High**

The differentiator — better admission data — is also the most labour-intensive part of the build. Admissions data is fragmented across 150+ local authorities and hundreds of academy trusts, each publishing in different formats (PDF booklets, web pages, nothing at all). The optimistic reading is "a normalisation pipeline"; the realistic one is "a permanent data-entry quagmire" that consumes every future weekend and never reaches national coverage.

Locrating's answer was 15 years of accumulation. We do not have 15 years.

**Mitigation:** Do not chase national catchment coverage. Ship the probabilistic model where data exists (top 20–30 urban LAs cover the majority of moving families), mark the rest honestly as "insufficient data," and let community corrections + scheduled FOI batches deepen coverage over years, not weeks. The product must be valuable *without* complete catchment data — school results, neighbourhood layers and honest presentation carry the early product.

**Kill signal:** By week 8, >40% of total effort is going into manual catchment data wrangling rather than product/distribution.

### R2 — SEO incumbency is a fortress
**L: High · I: High**

Locrating has 15 years of domain authority and millions of indexed pages. SchoolGuide and Snobe occupy the same SERPs. Google's helpful-content era is hostile to thin programmatic pages. The plan assumes long-tail SEO delivers distribution; it may deliver nothing for 12–18 months, which is a long time to work for free.

**Mitigation:** Do not publish thin pages. Each programmatic page must be genuinely the best result for its query (rich data, unique presentation, fast). Target long-tail the incumbents serve poorly ("[school] admission chances", "[postcode] schools", comparison queries). Win engagement signals (speed, dwell, return visits) — Google's observable proxy for quality. Treat SEO as year-two distribution; use communities (Mumsnet, Reddit) for year-one traffic and feedback.

**Kill signal:** After 6 months of national pages live: <15k monthly organic sessions and no upward trend in impressions (Search Console).

### R3 — Monetisation arrives later and smaller than hoped
**L: Medium · I: High**

Lead-gen and ad revenue require scale (50–100k monthly users) that may take 18+ months. Seasonality is real: admissions traffic spikes October–January (secondary) and January–April (primary) and sags in summer. Meanwhile the founder carries £65k of debt. The danger is not that the asset fails; it is that the founder needs money *this year* and begins starving the asset, or worse, starts expecting it to be the cash engine it cannot yet be.

**Mitigation:** The Studio Plan already separates concerns: this is an *owned asset*, not the *cash engine*. Keep the productised service alive for near-term income. Write the expected revenue curve down now (£0 for months 1–6; £0–1k/mo months 7–12; £3–8k/mo at 100k users) and judge the project against that curve, not against hope.

**Kill signal:** Founder begins skipping cash-engine work to feed Prospectus before the month-6 gate.

### R4 — Legal and liability exposure
**L: Medium · I: Medium–High**

- **Reliance/liability:** Parents make six-figure decisions partly on our data. A wrong "Strong chance" that becomes a refused place creates reputational — and conceivably legal — exposure. The honesty brand *raises* the stakes on calibration: if our odds are wrong, we betray users twice.
- **Database right:** OGL covers most government data, but LA admission booklets and third-party aggregations are not uniformly OGL. Bulk re-publishing of LA-compiled tables needs a licence read per source.
- **Extension ToS:** Overlaying data on Rightmove/Zoopla pages is user-side rendering (Locrating does it), but portals' ToS are hostile and Chrome Web Store policy can shift; the extension can be delisted or the portals can DOM-break it monthly.
- **Trademark/passing-off:** Comparisons to Locrating in marketing ("free alternative to…") must be factual and careful.

**Mitigation:** Prominent methodology + "guide, not guarantee" framing everywhere; backtested accuracy published; per-source licence audit during pipeline build (Week 2 gate); extension built defensively (feature-detection, graceful degradation); no comparative marketing until legal read.

**Kill signal:** Any source sends a credible cease-and-desist on data we cannot replace; or extension delisting with no compliant path back.

### R5 — One founder, one day job, one large build
**L: High · I: High**

This is a data pipeline, a national website, a design system, a map product, an SEO operation, a monetisation stack and (later) a browser extension — built by one person alongside Treasure Spring employment. The Studio Plan's own attention rule says: *one active build, one active cash engine, one research queue.* Prospectus is exactly the kind of intellectually delicious project that eats the rule.

**Mitigation:** Hard scope walls (§5 of the PRD is a contract, not a wish). Weekly hour budget agreed in advance (suggestion: 10 focused hours, not 25 chaotic ones). Pilot region before national — always. Contractors for commodity work (data cleaning) once cash engine funds it.

**Kill signal:** Week-6 checkpoint: pilot region not live end-to-end → scope cut, not schedule slip. Two consecutive missed checkpoints → pause the project deliberately rather than letting it bleed.

### R6 — The incumbent responds
**L: Medium · I: Medium**

Locrating is profitable, lean and family-run — it can react. Options open to it: expand the free tier, cut price, ship a redesign, lean on its B2B plugin network, or lawyer up over scraped-origin comparisons. Its premium revenue *is* the thing we attack, so if we gain traction, expect a response.

**Mitigation:** Our defence is structural, not tactical: they cannot go free without cannibalising the revenue that funds them (innovator's dilemma — this is precisely why the free attack works), and a redesign of a WebForms estate takes them years. Keep shipping; do not get into public fights; let the products talk.

**Kill signal:** None — incumbent response is validation, not a kill condition. But note it and re-run this red team if it happens.

### R7 — Platform dependencies
**L: Medium · I: Medium**

Google (organic), Chrome Web Store (extension), and the portals' DOMs (extension overlays) are all platforms we do not control. Any one can change the rules and halve the business.

**Mitigation:** Diversify distribution early (community, direct, newsletter/alerts product = owned channel); accounts + alerts convert anonymous SEO traffic into an owned relationship — this is the strategic reason accounts ship in v2, not a nice-to-have.

**Kill signal:** >70% of traffic from a single Google channel at month 9 with no owned-channel growth.

### R8 — Data supply shocks and the maintenance tax
**L: Medium · I: Medium**

Ofsted is mid-transition from single-word grades to report cards; DfE changes download formats; LAs redesign sites; APIs version. Every source is a small ongoing liability. The product's credibility rests on freshness, and stale data is brand poison for a "glass box."

**Mitigation:** Per-source monitors with alerting; freshness badges on pages (a feature, not a chore — provenance is the brand); design the pipeline for replaceable adapters per source.

**Kill signal:** Freshness SLA breached for >30% of schools for >60 days, twice.

### R9 — The copycat paradox
**L: Low–Medium · I: Low–Medium**

Glass-box methodology means competitors can see exactly where our data comes from. A funded team could replicate the pipeline.

**Mitigation:** Sources are public but the *normalised historical dataset*, the calibration, the brand trust and the SEO footprint are not copyable quickly. Bustimes lesson: the moat is the accumulated system, not the data. Speed and taste are the defence.

### R10 — The founder gets seduced by the wrong win
**L: Medium · I: Medium**

The project is rich in vanity rewards: beautiful UI compliments, designer Twitter applause, launch-day traffic. None of these pay. The Studio Plan warns explicitly: *do not confuse a beautiful interface with a valuable business.* There is a version of this project that is a magnificent portfolio piece and a terrible business — and it is the most seductive version available.

**Mitigation:** Judge only by the gate metrics (§12 of the PRD): organic sessions, trust-moment views, revenue. Design praise is a leading indicator of nothing except design.

---

## 2. Pre-mortem — it is August 2028 and this failed

*The most likely failure story, written in advance:*

The MVP shipped and was genuinely beautiful — designers loved it. The founder spent months perfecting the confidence gradient and the school pages while SEO quietly delivered almost nothing, because two-month-old domains do not outrank fifteen-year-old ones. Community posts on Mumsnet got warm replies and 400 visits, not 40,000. The catchment data for the pilot region was good, but national coverage stalled at 11 LAs because every allocation booklet was a different PDF shape and each one cost an evening. Revenue in year one totalled £213 from broadband affiliate clicks. The founder, needing real money, took on more service work to clear debt — correctly — and Prospectus entered the zombie state the Studio Plan forbids: not dead, not alive, still "promising." The final cost was not money; it was 18 months of the one non-renewable resource — focused attention — spent on an asset that never reached the scale where its monetisation model activates.

*Notice what did NOT kill it in this story:* Locrating, lawyers, or technology. **Distribution and attention killed it.** That is where the defence must be strongest.

---

## 3. What would have to be true

Before heavy build, these validations gate the investment (Week 1–2):

1. **SEO demand confirmed** — keyword study shows catchment/schools long-tail volume worth owning (>500k monthly searches across the target cluster) with beatable SERP quality
2. **Data obtainable at acceptable cost** — 3-LA sample shows allocation data extractable in <2 hours/LA average (probe: ✅ 9/10 national sources live)
3. **Parents confirm the pain** — 5 interviews: parents currently pay, hack around, or distrust existing tools; the honest-probability framing lands
4. **Scope holds** — pilot region shippable in 4 weeks at the agreed hour budget

If any gate fails: reshape or park. The Studio Plan's rule applies: *kill the idea unless the evidence is compelling.*

---

## 4. Kill criteria (summary, binding)

| Signal | Threshold | Decision |
|---|---|---|
| Effort distortion | >40% effort on manual data wrangling by week 8 | Reshape scope |
| MVP slip | Pilot not live by week 6 | Cut scope, not dates |
| Organic traction | <15k monthly sessions at month 6, flat impressions | Kill or maintain-only |
| Revenue | No monetisation signal at month 6 (zero leads/clicks) | Kill monetisation surfaces; reconsider model |
| Cash-engine cannibalisation | Service income dropped to feed Prospectus before gate | Immediate rebalance |
| Legal | Credible C&D on irreplaceable data | Comply; reassess viability |
| Zombie check | Months 6–9 without a kill/maintain/double-down decision | The decision is overdue — make it |

---

## 5. Closing verdict

The red team's strongest case: **this is a distribution-and-attention problem disguised as a product problem.** The build is achievable; the data is real and verified; the design win is near-guaranteed. What is not guaranteed is that a free product with an 18-month SEO ramp and lead-gen economics reaches escape velocity inside one founder's spare hours — while that founder needs the separate cash engine to clear real debt.

And yet: the structural attack remains sound. The incumbent sells false certainty at £13/month on a 15-year-old stack, cannot go free without eating its own revenue, and has told us on its own pricing page that free competitors are what it fears. The bustimes pattern says these markets reward patient, design-led, data-normalising entrants. The gates above are designed to confirm demand before attention is committed — and to kill the project honestly if the market disagrees.

Build it as an experiment with teeth, sir. Not as a hope.

---

*Read alongside: "PRD — Project Prospectus." Both documents derive from the Digital-Asset Studio Plan (July 2026) and the 30 July wealth-strategy session.*
