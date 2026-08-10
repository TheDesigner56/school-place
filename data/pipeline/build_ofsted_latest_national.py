#!/usr/bin/env python3
"""National new-framework report cards from the Ofsted management-information CSV.

Keeps the existing 31 pilot cards byte-identical, then adds every other
new-framework card found in the ytd file (latest inspection per URN).
"""
import csv, json, os
from collections import defaultdict

BASE = "/Users/admin/projects/prospectus"
SRC = "/tmp/ofsted_all_inspections_ytd_jun2026.csv"
OUT = os.path.join(BASE, "web/public/data/ofsted_latest.json")

SUBJ = ["Safeguarding standards", "Inclusion", "Curriculum and teaching", "Achievement",
        "Attendance and behaviour", "Personal development and wellbeing",
        "Early years (where applicable)", "Post-16 provision (where applicable)", "Leadership and governance"]

# existing 31 pilot cards — keep exactly
existing = {}
if os.path.exists(OUT):
    existing = json.load(open(OUT))
print(f"existing cards kept: {len(existing)}")

# latest inspection per URN from the ytd file
rows_by_urn = defaultdict(list)
with open(SRC, encoding="cp1252") as f:
    for r in csv.DictReader(f):
        urn = (r.get("URN") or "").strip()
        if urn:
            rows_by_urn[urn].append(r)

def card_from(r):
    sub = {}
    for k in SUBJ:
        v = (r.get(k) or "").strip()
        if v and v.lower() not in ("n/a", "not applicable", ""):
            key = k.lower().replace(" (where applicable)", "").replace(" ", "_")
            sub[key] = v
    return {
        "inspection_date": (r.get("Inspection start date") or "").strip() or None,
        "publication_date": (r.get("Publication date") or "").strip() or None,
        "inspection_type": (r.get("Inspection type") or "").strip() or None,
        "report_url": (r.get("Web Link (opens in new window)") or "").strip() or None,
        "idaci_quintile": (r.get("The income deprivation affecting children index (IDACI) quintile") or "").strip() or None,
        "sub_judgements": sub or None,
        "source_label": "Ofsted management information · latest inspection",
        "source_url": "https://www.gov.uk/government/collections/ofsted-school-inspections-statistics",
    }

def date_key(r):
    return (r.get("Inspection start date") or "").strip()

added = 0
for urn, rs in rows_by_urn.items():
    if urn in existing:
        continue
    latest = max(rs, key=date_key)
    existing[urn] = card_from(latest)
    added += 1

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(existing, f, ensure_ascii=False, separators=(",", ":"))

with_sub = sum(1 for v in existing.values() if v["sub_judgements"])
with_url = sum(1 for v in existing.values() if v["report_url"])
print(f"total cards: {len(existing)} (kept {len(existing)-added}, added {added}) | with sub-judgements: {with_sub} | with report URL: {with_url}")
