#!/usr/bin/env python3
"""Extract Ofsted latest-inspection + report-card sub-judgements for pilot schools
from the Ofsted management-information CSV (new framework: sub-judgements, no single grade)."""
import csv, json, os, sqlite3

BASE = "/Users/admin/projects/prospectus"
SRC = "/tmp/ofsted_all_inspections_ytd_jun2026.csv"

conn = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
pilot = {str(u) for (u,) in conn.execute("SELECT urn FROM schools")}

SUBJ = ["Safeguarding standards","Inclusion","Curriculum and teaching","Achievement",
        "Attendance and behaviour","Personal development and wellbeing",
        "Early years (where applicable)","Post-16 provision (where applicable)","Leadership and governance"]

out = {}
with open(SRC, encoding="cp1252") as f:
    for r in csv.DictReader(f):
        urn = (r.get("URN") or "").strip()
        if urn not in pilot:
            continue
        sub = {}
        for k in SUBJ:
            v = (r.get(k) or "").strip()
            if v and v.lower() not in ("n/a", "not applicable", ""):
                key = k.lower().replace(" (where applicable)", "").replace(" ", "_")
                sub[key] = v
        out[urn] = {
            "inspection_date": (r.get("Inspection start date") or "").strip() or None,
            "publication_date": (r.get("Publication date") or "").strip() or None,
            "inspection_type": (r.get("Inspection type") or "").strip() or None,
            "report_url": (r.get("Web Link (opens in new window)") or "").strip() or None,
            "idaci_quintile": (r.get("The income deprivation affecting children index (IDACI) quintile") or "").strip() or None,
            "sub_judgements": sub or None,
            "source_label": "Ofsted management information · latest inspection",
            "source_url": "https://www.gov.uk/government/collections/ofsted-school-inspections-statistics",
        }

with open(os.path.join(BASE, "web/public/data/ofsted_latest.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

with_sub = sum(1 for v in out.values() if v["sub_judgements"])
with_url = sum(1 for v in out.values() if v["report_url"])
print(f"pilot schools matched: {len(out)}/236 | with sub-judgements: {with_sub} | with report URL: {with_url}")
s = out.get("145515")
print(json.dumps(s, indent=1)[:500] if s else "bathwick missing")
