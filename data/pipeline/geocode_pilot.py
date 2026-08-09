#!/usr/bin/env python3
"""Geocode pilot schools via postcodes.io bulk endpoint (100 postcodes per call)."""
import csv
import json
import time
import urllib.request

IN = "/Users/admin/projects/prospectus/data/processed/pilot_schools.csv"
OUT = "/Users/admin/projects/prospectus/data/processed/pilot_schools_geo.csv"

BULK_URL = "https://api.postcodes.io/postcodes"


def bulk_lookup(postcodes):
    body = json.dumps({"postcodes": postcodes}).encode()
    req = urllib.request.Request(
        BULK_URL,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "prospectus-pipeline/0.1"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def main():
    with open(IN, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    pcs = [r["postcode"] for r in rows if r.get("postcode")]
    uniq = sorted(set(pcs))
    print(f"{len(rows)} schools, {len(uniq)} unique postcodes")

    geo = {}
    for i in range(0, len(uniq), 100):
        batch = uniq[i:i + 100]
        data = bulk_lookup(batch)
        for item in data.get("result", []):
            q = item.get("query")
            res = item.get("result")
            if res:
                geo[q] = {
                    "lat": res.get("latitude"),
                    "lng": res.get("longitude"),
                    "oa21": res.get("oa21", ""),
                    "lsoa": res.get("lsoa", ""),
                    "msoa": res.get("msoa", ""),
                    "ward": res.get("admin_ward", ""),
                    "district": res.get("admin_district", ""),
                    "parish": res.get("parish", ""),
                    "nuts": res.get("nuts", ""),
                }
            else:
                geo[q] = {"lat": None, "lng": None}
        time.sleep(0.35)
        print(f"  geocoded {min(i + 100, len(uniq))}/{len(uniq)}")

    extra = ["lat", "lng", "oa21", "lsoa", "msoa", "ward", "district", "parish"]
    fields = list(rows[0].keys()) + extra
    ok, fail = 0, 0
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            g = geo.get(r.get("postcode", ""), {})
            for k in extra:
                r[k] = g.get(k, "")
            w.writerow(r)
            if g.get("lat"):
                ok += 1
            else:
                fail += 1
    print(f"Wrote {OUT} — geocoded {ok}, failed {fail}")


if __name__ == "__main__":
    main()
