#!/usr/bin/env python3
"""School Place pilot verification suite.
Asserts data-file integrity, cross-layer joins, coverage floors, and that
prerendered pages contain the sections each data layer should produce.
Exit 0 = all pass; prints PASS/FAIL per check."""
import json, os, re, sys, glob

BASE = "/Users/admin/projects/prospectus"
WEB = os.path.join(BASE, "web")
DATA = os.path.join(WEB, "public/data")
OUT = os.path.join(WEB, ".next/server/app")

passed, failed = [], []
def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f"  ({detail})" if detail else ""))

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)

# ---------- 1. data files parse + schema ----------
schools = load("schools.json")
crime = load("crime.json")
perf = load("performance.json")
prices = load("prices.json")
adm = load("admissions.json")
meta = load("meta.json")

check("schools.json: 236 schools", len(schools) == 236, f"got {len(schools)}")
SCHOOL_FIELDS = {"urn","name","slug","phase","la","postcode","lat","lng","ofsted","lsoa"}
check("schools: required fields present", all(SCHOOL_FIELDS <= set(s) for s in schools))
check("schools: unique slugs", len({s["slug"] for s in schools}) == 236)
check("schools: unique urns", len({s["urn"] for s in schools}) == 236)

check("crime.json: LSOAs > 400", len(crime) > 400, f"{len(crime)} LSOAs")
check("crime: totals consistent",
      all(v["total"] == sum(v["by_category"].values()) for v in crime.values()))

check("performance: KS2 coverage >= 130",
      sum(1 for v in perf.values() if "ks2" in v) >= 130,
      f"{sum(1 for v in perf.values() if 'ks2' in v)} primary")
check("performance: GCSE coverage >= 30",
      sum(1 for v in perf.values() if "gcse" in v) >= 30,
      f"{sum(1 for v in perf.values() if 'gcse' in v)} secondary")

price_districts = {k: v for k, v in prices.items() if not k.startswith("_")}
check("prices: >= 18 districts", len(price_districts) >= 18, f"{len(price_districts)}")
check("prices: medians sane (50k-2M)",
      all(v["median"] is None or 50_000 <= v["median"] <= 2_000_000 for v in price_districts.values()))

check("admissions: >= 15 schools", len(adm) >= 15, f"{len(adm)}")
dist_years = [y for v in adm.values() for y in v["years"] if y["last_distance_m"]]
check("admissions: >= 18 school-years with distance", len(dist_years) >= 18, f"{len(dist_years)}")
check("admissions: distances sane (10m-30km)",
      all(10 <= y["last_distance_m"] <= 30_000 for y in dist_years))

# ---------- 2. cross-layer joins ----------
urns = {str(s["urn"]) for s in schools}
check("performance URNs subset of schools", set(perf) <= urns,
      f"{len(set(perf) - urns)} orphans")
check("admissions URNs subset of schools", set(adm) <= urns,
      f"{len(set(adm) - urns)} orphans")
school_lsoas = {s["lsoa"] for s in schools if s.get("lsoa")}
check("crime join: >= 90% school LSOAs have crime data",
      len(school_lsoas & set(crime)) / max(1, len(school_lsoas)) >= 0.9,
      f"{len(school_lsoas & set(crime))}/{len(school_lsoas)}")
school_districts = {s["postcode"].split()[0].upper() for s in schools}
check("prices join: >= 80% school districts have prices",
      len(school_districts & set(price_districts)) / max(1, len(school_districts)) >= 0.8,
      f"{len(school_districts & set(price_districts))}/{len(school_districts)}")

# ---------- 3. prerendered output ----------
school_html = glob.glob(os.path.join(OUT, "school/*.html"))
area_html = glob.glob(os.path.join(OUT, "area/*.html"))
check("prerender: 236 school pages", len(school_html) == 236, f"{len(school_html)}")
check("prerender: >= 20 area pages", len(area_html) >= 20, f"{len(area_html)}")
for p in ["index.html", "methodology.html", "compare.html"]:
    check(f"prerender: {p}", os.path.exists(os.path.join(OUT, p)))

def page_contains(path, needles):
    if not os.path.exists(path):
        return False, "file missing"
    html = open(path, encoding="utf-8").read()
    missing = [n for n in needles if n not in html]
    return (not missing), (f"missing: {missing}" if missing else "")

# Bathwick St Mary: has admissions + KS2 + prices + crime
ok, det = page_contains(os.path.join(OUT, "school/bathwick-st-mary-church-school-145515.html"),
                        ["Getting in", "536 m", "Exam results", "Local market", "Neighbourhood safety", "volatility band"])
check("school page: all 4 data layers render (Bathwick)", ok, det)

# a secondary: GCSE card
ok, det = page_contains(os.path.join(OUT, "school/bath-academy-137湖畔.html"), ["x"]) if False else (True, "")
sec = [s for s in schools if s["phase"] == "Secondary" and str(s["urn"]) in perf and "gcse" in perf[str(s["urn"])]]
if sec:
    p = os.path.join(OUT, f"school/{sec[0]['slug']}.html")
    ok, det = page_contains(p, ["GCSE", "Attainment 8"])
    check(f"school page: GCSE card ({sec[0]['name'][:30]})", ok, det)

ok, det = page_contains(os.path.join(OUT, "area/bs7.html"), ["Schools in", "Sold house prices", "Median"])
check("area page: schools + prices render (BS7)", ok, det)

ok, det = page_contains(os.path.join(OUT, "methodology.html"), ["false precision"])
check("methodology: honesty principle present", ok, det)

# no placeholders left anywhere in school pages
PLACEHOLDERS = ["TODO", "Lorem ipsum", "coming soon", "Coming Soon"]
bad = []
for f in school_html[:60]:
    t = open(f, encoding="utf-8").read()
    if any(p in t for p in PLACEHOLDERS):
        bad.append(os.path.basename(f))
check("no placeholder text in school pages (sample 60)", not bad, ",".join(bad[:3]))

print(f"\n{'='*50}\n{len(passed)} passed, {len(failed)} failed")
if failed:
    print("FAILURES:", *failed, sep="\n  - ")
    sys.exit(1)
print("ALL GREEN")
