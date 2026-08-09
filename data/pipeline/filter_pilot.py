#!/usr/bin/env python3
"""Filter Ofsted outcomes 2025 to pilot LAs (Bath & NE Somerset, Bristol) and report counts."""
import csv
from collections import Counter

SRC = "/Users/admin/projects/prospectus/data/raw/ofsted_outcomes_2025.csv"

las = Counter()
with open(SRC, newline="", encoding="cp1252", errors="replace") as f:
    for row in csv.DictReader(f):
        la = (row.get("Local authority") or "").strip()
        low = la.lower()
        if "bath" in low or "bristol" in low or "somerset" in low:
            las[la] += 1

print("LA matches:")
for la, n in sorted(las.items()):
    print(f"  {n:4d}  {la}")
