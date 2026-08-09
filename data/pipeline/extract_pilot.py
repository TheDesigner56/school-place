#!/usr/bin/env python3
"""Extract pilot-region schools (Bath & NE Somerset + Bristol) from Ofsted outcomes 2025.

Outputs a clean CSV with the fields the product needs, ready for geocoding.
"""
import csv
import re

SRC = "/Users/admin/projects/prospectus/data/raw/ofsted_outcomes_2025.csv"
OUT = "/Users/admin/projects/prospectus/data/processed/pilot_schools.csv"

PILOT_LAS = {"Bath and North East Somerset", "Bristol"}

# Fields we keep (renamed to snake_case)
FIELDS = {
    "URN": "urn",
    "School name": "name",
    "Ofsted phase": "phase",
    "Type of education": "type",
    "Local authority": "la",
    "Postcode": "postcode",
    "Admissions policy": "admissions_policy",
    "Multi-academy trust name": "mat",
    "Total number of pupils": "pupils",
    "Statutory lowest age": "age_low",
    "Statutory highest age": "age_high",
    "Sixth form": "sixth_form",
    "Ofsted region": "ofsted_region",
    "Region": "region",
    "Parliamentary constituency": "constituency",
    "The income deprivation affecting children index (IDACI) quintile": "idaci_quintile",
}

# Find the graded-outcome + date columns by fuzzy match on header
GRADE_COL_HINTS = [
    "graded inspection overall outcome",
    "overall effectiveness",
    "latest graded inspection overall outcome",
]
DATE_COL_HINTS = [
    "date of latest graded inspection",
    "graded inspection date",
]


def pick(headers, hints):
    for h in headers:
        hl = h.strip().lower()
        if any(hint in hl for hint in hints):
            return h
    return None


def norm_pc(pc):
    pc = re.sub(r"\s+", " ", (pc or "").strip().upper())
    return pc if re.match(r"^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$", pc) else ""


# Exact-match column names first, then fuzzy fallback
GRADE_EXACT = "Overall effectiveness"
DATE_EXACT = "Inspection start date"
DATE_PUB = "Publication date"


def main():
    with open(SRC, newline="", encoding="cp1252", errors="replace") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        grade_col = GRADE_EXACT if GRADE_EXACT in headers else pick(headers, GRADE_COL_HINTS)
        date_col = DATE_EXACT if DATE_EXACT in headers else pick(headers, DATE_COL_HINTS)
        pub_col = DATE_PUB if DATE_PUB in headers else None
        out_fields = list(FIELDS.values()) + ["ofsted_grade", "ofsted_date", "ofsted_pub_date"]

        kept = []
        for row in reader:
            la = (row.get("Local authority") or "").strip()
            if la not in PILOT_LAS:
                continue
            rec = {dst: (row.get(src) or "").strip() for src, dst in FIELDS.items()}
            rec["postcode"] = norm_pc(rec["postcode"])
            rec["ofsted_grade"] = (row.get(grade_col) or "").strip() if grade_col else ""
            rec["ofsted_date"] = (row.get(date_col) or "").strip() if date_col else ""
            rec["ofsted_pub_date"] = (row.get(pub_col) or "").strip() if pub_col else ""
            kept.append(rec)

    import os
    os.makedirs("/Users/admin/projects/prospectus/data/processed", exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=out_fields)
        w.writeheader()
        w.writerows(kept)

    with_pc = sum(1 for r in kept if r["postcode"])
    graded = sum(1 for r in kept if r["ofsted_grade"])
    print(f"Extracted {len(kept)} schools -> {OUT}")
    print(f"  with postcode: {with_pc}")
    print(f"  with ofsted grade: {graded}")
    print(f"  grade column used: {grade_col!r}")
    print(f"  date column used: {date_col!r}")
    # Phase breakdown
    from collections import Counter
    phases = Counter(r["phase"] for r in kept)
    print("  phases:", dict(phases))


if __name__ == "__main__":
    main()
