#!/usr/bin/env python3
"""
build_national_webdata.py — pre-build splitter for the national School Place site.

Reads the national layer JSONs in web/public/data/ and writes:
  web/public/data/schools/<slug>.json   — one merged per-school record (~5-15KB each)
  web/public/data/districts.json         — {district_lowercase: [slug, ...]}
  web/public/data/slugs.json             — {slug: urn}

This is what lets the Next.js static export build 22k school pages without
reading ~56MB of JSON per page. Idempotent: re-run any time (e.g. after
flood.json / prices.json land) — the schools/ dir is rebuilt from scratch.

Usage: python3 data/pipeline/build_national_webdata.py
"""

import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "web", "public", "data")
SCHOOLS_DIR = os.path.join(DATA_DIR, "schools")

LAYERS = [
    "schools.json",
    "ofsted_full.json",
    "performance.json",
    "performance_history.json",
    "characteristics.json",
    "admissions.json",
    "crime.json",
    "prices.json",
    "flood.json",  # may not exist yet — handled gracefully
    "meta.json",
]


def load(name: str):
    """Load a layer JSON; return None if missing (flood.json etc)."""
    p = os.path.join(DATA_DIR, name)
    if not os.path.exists(p):
        print(f"  [skip] {name} — not present, continuing")
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    print(f"Data dir: {DATA_DIR}")
    layers = {name: load(name) for name in LAYERS}

    schools = layers["schools.json"]
    if not isinstance(schools, list) or len(schools) == 0:
        print("ERROR: schools.json missing or empty", file=sys.stderr)
        return 1

    ofsted_full = layers["ofsted_full.json"] or {}
    performance = layers["performance.json"] or {}
    perf_history = layers["performance_history.json"] or {}
    characteristics = layers["characteristics.json"] or {}
    admissions = layers["admissions.json"] or {}
    crime = layers["crime.json"] or {}
    prices = layers["prices.json"] or {}
    flood = layers["flood.json"] or {}
    meta = layers["meta.json"] or {}

    # Rebuild the schools/ dir from scratch (idempotent)
    if os.path.isdir(SCHOOLS_DIR):
        shutil.rmtree(SCHOOLS_DIR)
    os.makedirs(SCHOOLS_DIR, exist_ok=True)

    districts: dict[str, list[str]] = {}
    slugs: dict[str, int] = {}
    total_bytes = 0
    n_written = 0
    n_with = {k: 0 for k in
              ["ofsted", "perf", "perf_history", "chars", "admissions", "crime", "prices", "flood"]}

    for s in schools:
        urn = str(s.get("urn"))
        slug = s.get("slug")
        if not slug:
            continue

        # Postcode district lookup key (prices.json is keyed by uppercase district)
        district_key = (s.get("postcode") or "").strip().split()[0].upper() if (s.get("postcode") or "").strip() else ""

        record = {
            "school": s,
            "ofsted": ofsted_full.get(urn),
            "perf": performance.get(urn),
            "perf_history": perf_history.get(urn),
            "chars": characteristics.get(urn),
            "admissions": admissions.get(urn),
            "crime": crime.get(s.get("lsoa")) if s.get("lsoa") else None,
            "prices": prices.get(district_key) if district_key else None,
            "flood": flood.get(urn),
            "data_as_of": meta.get("data_as_of"),
        }

        for k in n_with:
            if record[k] is not None:
                n_with[k] += 1

        # District index (lowercase postcode district -> slugs)
        d = district_key.lower()
        if d:
            districts.setdefault(d, []).append(slug)

        slugs[slug] = s.get("urn")

        out = os.path.join(SCHOOLS_DIR, f"{slug}.json")
        with open(out, "w", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")))
        total_bytes += os.path.getsize(out)
        n_written += 1

    # districts.json
    with open(os.path.join(DATA_DIR, "districts.json"), "w", encoding="utf-8") as f:
        json.dump(districts, f, ensure_ascii=False, separators=(",", ":"))
    districts_bytes = os.path.getsize(os.path.join(DATA_DIR, "districts.json"))

    # slugs.json
    with open(os.path.join(DATA_DIR, "slugs.json"), "w", encoding="utf-8") as f:
        json.dump(slugs, f, ensure_ascii=False, separators=(",", ":"))
    slugs_bytes = os.path.getsize(os.path.join(DATA_DIR, "slugs.json"))

    print(f"\n=== SUMMARY ===")
    print(f"Schools processed:      {len(schools)}")
    print(f"Per-school files:       {n_written}")
    print(f"Districts:              {len(districts)}")
    print(f"Slugs indexed:          {len(slugs)}")
    print(f"Per-school bytes:       {total_bytes:,} ({total_bytes/1024/1024:.1f} MB)")
    print(f"districts.json bytes:   {districts_bytes:,}")
    print(f"slugs.json bytes:       {slugs_bytes:,}")
    print(f"Avg per-school file:    {total_bytes/max(n_written,1):.0f} bytes")
    print(f"Records with layer data:")
    for k, v in n_with.items():
        print(f"  {k:12s} {v:6d} ({v/len(schools)*100:.1f}%)")
    if layers["flood.json"] is None:
        print("  NOTE: flood.json not present — flood layer skipped (will be picked up on re-run)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
