#!/usr/bin/env python3
"""Merged Ofsted layer: per-school latest + previous graded inspection (dates, grades,
sub-judgements) from the outcomes file; new-framework report cards for recently inspected."""
import csv, json, os, sqlite3

BASE = "/Users/admin/projects/prospectus"
OUTCOMES = os.path.join(BASE, "data/raw/ofsted_outcomes_2025.csv")
LATEST_JSON = os.path.join(BASE, "web/public/data/ofsted_latest.json")  # 31 new-framework report cards

conn = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
pilot = {str(u) for (u,) in conn.execute("SELECT urn FROM schools")}

def d(s):
    s = (s or "").strip()
    return s or None

GRADE = {"1": "Outstanding", "2": "Good", "3": "Requires Improvement", "4": "Inadequate", "9": None}
def g(s):
    s = (s or "").strip()
    return GRADE.get(s, s or None)

out = {}
with open(OUTCOMES, encoding="cp1252") as f:
    for r in csv.DictReader(f):
        urn = (r.get("URN") or "").strip()
        if urn not in pilot:
            continue
        latest = {
            "date": d(r.get("Inspection start date")),
            "publication_date": d(r.get("Publication date")),
            "type": d(r.get("Inspection type")),
            "overall": g(r.get("Overall effectiveness")),
            "sub": {k: g(r.get(col)) if col != "Safeguarding is effective?" else d(r.get(col)) for k, col in [
                ("quality_of_education", "Quality of education"),
                ("behaviour_and_attitudes", "Behaviour and attitudes"),
                ("personal_development", "Personal development"),
                ("leadership_and_management", "Effectiveness of leadership and management"),
                ("safeguarding_effective", "Safeguarding is effective?"),
                ("early_years", "Early years provision (where applicable)"),
                ("sixth_form", "Sixth form provision (where applicable)"),
            ]},
        }
        latest["sub"] = {k: v for k, v in latest["sub"].items() if v} or None
        previous = None
        if d(r.get("Previous inspection start date")):
            previous = {
                "date": d(r.get("Previous inspection start date")),
                "publication_date": d(r.get("Previous publication date")),
                "overall": g(r.get("Previous graded inspection overall effectiveness")),
                "quality_of_education": g(r.get("Previous quality of education")),
            }
        out[urn] = {
            "report_url": d(r.get("Web Link (opens in new window)")),
            "latest": latest,
            "previous": previous,
            "idaci_quintile": d(r.get("The income deprivation affecting children index (IDACI) quintile")),
            "source_label": "Ofsted outcomes at 31 August 2025",
            "source_url": "https://www.gov.uk/government/statistics/state-funded-schools-inspections-and-outcomes-as-at-31-august-2025",
        }

# merge new-framework report cards where present
if os.path.exists(LATEST_JSON):
    cards = json.load(open(LATEST_JSON))
    for urn, card in cards.items():
        if urn in out:
            out[urn]["report_card_2026"] = {
                "inspection_date": card["inspection_date"],
                "sub_judgements": card["sub_judgements"],
            }

with open(os.path.join(BASE, "web/public/data/ofsted_full.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

with_prev = sum(1 for v in out.values() if v["previous"])
with_url = sum(1 for v in out.values() if v["report_url"])
with_cards = sum(1 for v in out.values() if "report_card_2026" in v)
print(f"schools: {len(out)}/236 | with previous inspection: {with_prev} | with report URL: {with_url} | new report cards: {with_cards}")
print(json.dumps(out.get("145515"), indent=1)[:600])
