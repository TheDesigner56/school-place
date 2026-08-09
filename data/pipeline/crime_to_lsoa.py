#!/usr/bin/env python3
"""Map crime points to LSOA via postcodes.io bulk reverse geocoding, then aggregate."""
import csv
import json
import time
import urllib.request
from collections import Counter, defaultdict

CRIME_RAW = "/Users/admin/projects/prospectus/data/processed/pilot_crime_raw.json"
OUT_CSV = "/Users/admin/projects/prospectus/data/processed/pilot_crime_lsoa.csv"
OUT_JSON = "/Users/admin/projects/prospectus/web/public/data/crime.json"
REVERSE_URL = "https://api.postcodes.io/postcodes"


def bulk_reverse(points):
    body = json.dumps({"geolocations": [
        {"longitude": lng, "latitude": lat} for lat, lng in points
    ]}).encode()
    req = urllib.request.Request(
        REVERSE_URL, data=body,
        headers={"Content-Type": "application/json", "User-Agent": "prospectus-pipeline/0.1"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def main():
    with open(CRIME_RAW, encoding="utf-8") as f:
        crimes = json.load(f)
    print(f"{len(crimes)} crimes loaded")

    # Extract coords
    pts = []
    for c in crimes:
        loc = (c.get("location") or {})
        try:
            lat = float(loc.get("latitude"))
            lng = float(loc.get("longitude"))
            pts.append((lat, lng))
        except (TypeError, ValueError):
            pts.append((None, None))

    # Reverse geocode in batches of 100
    for i in range(0, len(pts), 100):
        batch = [(la, ln) for la, ln in pts[i:i+100] if la is not None]
        if not batch:
            continue
        data = bulk_reverse(batch)
        # Match results back by order
        bi = 0
        for j, (la, ln) in enumerate(pts[i:i+100]):
            if la is None:
                continue
            res = data.get("result", [{}])[bi] if bi < len(data.get("result", [])) else {}
            bi += 1
            result = res.get("result")
            # Reverse-geocode returns a LIST of nearest postcodes (or None)
            if isinstance(result, list):
                result = result[0] if result else None
            if isinstance(result, dict):
                crimes[i+j]["_lsoa_code"] = result.get("lsoa", "")
                crimes[i+j]["_lsoa_name"] = result.get("lsoa", "")
                crimes[i+j]["_ward"] = result.get("admin_ward", "")
                crimes[i+j]["_district"] = result.get("admin_district", "")
        time.sleep(0.3)
        print(f"  reverse-geocoded {min(i+100, len(pts))}/{len(pts)}")

    # Aggregate by LSOA
    by_lsoa = defaultdict(Counter)
    for c in crimes:
        code = c.get("_lsoa_code")
        if not code:
            continue
        by_lsoa[code][c.get("category", "other-crime")] += 1

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["lsoa_code", "category", "count", "month"])
        for code, cats in by_lsoa.items():
            for cat, n in cats.items():
                w.writerow([code, cat, n, crimes[0].get("month", "")])

    out = {code: {"total": sum(c.values()), "by_category": dict(c)} for code, c in by_lsoa.items()}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    total = sum(sum(c.values()) for c in by_lsoa.values())
    print(f"LSOAs: {len(by_lsoa)}, categorised crimes: {total}")
    print(f"Wrote {OUT_CSV} and {OUT_JSON}")


if __name__ == "__main__":
    main()
