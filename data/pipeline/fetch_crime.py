#!/usr/bin/env python3
"""Fetch street-level crime for the pilot region (Bath + Bristol) and aggregate by LSOA.

Police.uk returns crimes within 1 mile of a lat/lng point. We sample a grid over the
pilot bounding box, dedupe by crime id, and aggregate counts per LSOA per category.
"""
import csv
import json
import time
import urllib.request
from collections import Counter, defaultdict

SCHOOLS = "/Users/admin/projects/prospectus/data/processed/pilot_schools_geo.csv"
OUT_CSV = "/Users/admin/projects/prospectus/data/processed/pilot_crime_lsoa.csv"
OUT_JSON = "/Users/admin/projects/prospectus/web/public/data/crime.json"

# Latest fully-published month
MONTH = "2026-05"
API = "https://data.police.uk/api/crimes-street/all-crime"

CATEGORIES = [
    "anti-social-behaviour", "bicycle-theft", "burglary", "criminal-damage-arson",
    "drugs", "other-theft", "possession-of-weapons", "public-order", "robbery",
    "shoplifting", "theft-from-the-person", "vehicle-crime", "violent-crime", "other-crime",
]


def fetch(lat, lng):
    url = f"{API}?lat={lat}&lng={lng}&date={MONTH}"
    req = urllib.request.Request(url, headers={"User-Agent": "prospectus-pipeline/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"    warn: {lat},{lng} -> {e}")
        return []


def main():
    # Build a sampling grid from school locations (deduped to ~2dp ≈ 1km) + region anchors
    pts = set()
    with open(SCHOOLS, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("lat") and r.get("lng"):
                pts.add((round(float(r["lat"]), 2), round(float(r["lng"]), 2)))
    pts = sorted(pts)
    print(f"Sampling {len(pts)} grid points for {MONTH}")

    seen = set()
    crime_rows = []
    for i, (lat, lng) in enumerate(pts):
        crimes = fetch(lat, lng)
        for c in crimes:
            cid = c.get("id")
            if cid in seen:
                continue
            seen.add(cid)
            crime_rows.append(c)
        if (i + 1) % 20 == 0:
            print(f"  {i+1}/{len(pts)} points, {len(seen)} unique crimes")
        time.sleep(0.25)

    print(f"Total unique crimes: {len(seen)}")

    # Save raw crimes for downstream LSOA mapping
    RAW_JSON = "/Users/admin/projects/prospectus/data/processed/pilot_crime_raw.json"
    with open(RAW_JSON, "w", encoding="utf-8") as f:
        json.dump(crime_rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote raw crimes to {RAW_JSON}")

    # Aggregate by LSOA code -> category counts
    by_lsoa = defaultdict(Counter)
    lsoa_names = {}
    for c in crime_rows:
        loc = c.get("location") or {}
        lsoa = loc.get("lsoa") or {}
        code = lsoa.get("code")
        name = lsoa.get("name")
        if not code:
            continue
        lsoa_names[code] = name or code
        cat = c.get("category", "other-crime")
        by_lsoa[code][cat] += 1

    # Write CSV
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["lsoa_code", "lsoa_name", "category", "count", "month"])
        for code, cats in by_lsoa.items():
            for cat, n in cats.items():
                w.writerow([code, lsoa_names[code], cat, n, MONTH])

    # Write JSON: {lsoa_code: {name, total, by_category}}
    out = {}
    for code, cats in by_lsoa.items():
        out[code] = {
            "name": lsoa_names[code],
            "total": sum(cats.values()),
            "by_category": dict(cats),
            "month": MONTH,
        }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    total = sum(sum(c.values()) for c in by_lsoa.values())
    print(f"Wrote {OUT_CSV} and {OUT_JSON}")
    print(f"LSOAs with crime data: {len(by_lsoa)}, total categorised crimes: {total}")


if __name__ == "__main__":
    main()
