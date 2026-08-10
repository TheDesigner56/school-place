#!/usr/bin/env python3
"""Verify the national build: counts, pilot preservation, geocode + grade coverage."""
import csv, json, os, sqlite3

BASE = "/Users/admin/projects/prospectus"

# 1. Pilot URNs (pilot_urns.json is actually URN -> school name; keys are the URNs)
d = json.load(open(f"{BASE}/data/processed/pilot_urns.json"))
pilot_urns = set(d.keys())
print(f"pilot URNs from pilot_urns.json: {len(pilot_urns)}")

# 2. National CSV
with open(f"{BASE}/data/processed/national_schools_geo.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print(f"national_schools_geo.csv rows: {len(rows)}")

geo_ok = sum(1 for r in rows if r.get("lat"))
grade_ok = sum(1 for r in rows if r.get("ofsted_grade"))
print(f"geocoded: {geo_ok} ({100.0*geo_ok/len(rows):.1f}%)")
print(f"with grade: {grade_ok} ({100.0*grade_ok/len(rows):.1f}%)")

# 3. schools.json
sj = json.load(open(f"{BASE}/web/public/data/schools.json"))
print(f"schools.json entries: {len(sj)}")
sj_by_urn = {str(s["urn"]): s for s in sj}
missing = pilot_urns - set(sj_by_urn)
print(f"pilot URNs missing from schools.json: {len(missing)} {sorted(missing)[:5] if missing else ''}")

# 4. Pilot slug preservation — compare against the pilot schools.json backup? We overwrote it.
#    Instead: recompute slug from name+urn and check pilot entries use the stored (pilot) slug.
#    The pilot file was overwritten, so compare against pilot.db slugs (still intact).
pconn = sqlite3.connect(f"{BASE}/data/processed/pilot.db")
pilot_slugs = {str(u): s for (u, s) in pconn.execute("SELECT urn, slug FROM schools")}
nconn = sqlite3.connect(f"{BASE}/data/processed/national.db")
nat_slugs = {str(u): s for (u, s) in nconn.execute("SELECT urn, slug FROM schools")}
slug_diff = {u: (pilot_slugs[u], nat_slugs.get(u)) for u in pilot_slugs if pilot_slugs[u] != nat_slugs.get(u)}
print(f"pilot slugs preserved: {len(pilot_slugs) - len(slug_diff)}/{len(pilot_slugs)} | diffs: {slug_diff}")

# 5. national.db
n = nconn.execute("SELECT COUNT(*) FROM schools").fetchone()[0]
print(f"national.db schools: {n}")
nconn.close(); pconn.close()

# 6. ofsted_full.json
of = json.load(open(f"{BASE}/web/public/data/ofsted_full.json"))
print(f"ofsted_full.json entries: {len(of)}")
with_grade = sum(1 for v in of.values() if v["latest"].get("overall"))
print(f"  with overall grade: {with_grade} ({100.0*with_grade/len(of):.1f}%)")
with_prev = sum(1 for v in of.values() if v["previous"])
with_cards = sum(1 for v in of.values() if "report_card_2026" in v)
print(f"  with previous: {with_prev} | with report cards: {with_cards}")

# 7. ofsted_latest.json
ol = json.load(open(f"{BASE}/web/public/data/ofsted_latest.json"))
print(f"ofsted_latest.json cards: {len(ol)}")

# 8. meta.json
meta = json.load(open(f"{BASE}/web/public/data/meta.json"))
print(f"meta: region={meta['region']} schools={meta['schools']} LAs={len(meta['by_la'])}")

# 9. Phase + LA summary
from collections import Counter
phases = Counter(r["phase"] for r in rows)
print("phases:", dict(phases))
print("top LAs:", Counter(r["la"] for r in rows).most_common(5))
