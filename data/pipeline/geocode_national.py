#!/usr/bin/env python3
"""Geocode ALL national schools via postcodes.io bulk endpoint (100/call).

Same conventions as geocode_pilot.py, plus:
- checkpoint to JSON every 50 calls so a crash doesn't lose progress
- resume from checkpoint if present
"""
import csv
import json
import os
import time
import urllib.request

IN = "/Users/admin/projects/prospectus/data/processed/national_schools.csv"
OUT = "/Users/admin/projects/prospectus/data/processed/national_schools_geo.csv"
CHECKPOINT = "/Users/admin/projects/prospectus/data/processed/geocode_checkpoint.json"

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
    if os.path.exists(CHECKPOINT):
        geo = json.load(open(CHECKPOINT))
        print(f"resumed from checkpoint: {len(geo)} postcodes already geocoded")

    done = len(geo)
    for i in range(done, len(uniq), 100):
        batch = uniq[i:i + 100]
        try:
            data = bulk_lookup(batch)
        except Exception as e:
            print(f"  batch {i} failed ({e}); checkpointing and retrying once")
            time.sleep(2)
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
        time.sleep(0.3)
        if (i // 100 + 1) % 50 == 0 or i + 100 >= len(uniq):
            tmp = CHECKPOINT + ".tmp"
            json.dump(geo, open(tmp, "w"))
            os.replace(tmp, CHECKPOINT)
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
    print(f"Wrote {OUT} — geocoded {ok}, failed {fail} ({100.0*ok/len(rows):.1f}%)")


if __name__ == "__main__":
    main()
