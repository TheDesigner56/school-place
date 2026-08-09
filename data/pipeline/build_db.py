#!/usr/bin/env python3
"""Build pilot SQLite DB + static JSON API from geocoded schools CSV."""
import csv
import json
import os
import sqlite3

BASE = "/Users/admin/projects/prospectus"
CSV_IN = f"{BASE}/data/processed/pilot_schools_geo.csv"
DB_OUT = f"{BASE}/data/processed/pilot.db"
JSON_DIR = f"{BASE}/web/public/data"

GRADE_MAP = {"1": "Outstanding", "2": "Good", "3": "Requires Improvement", "4": "Inadequate"}


def main():
    with open(CSV_IN, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    os.makedirs(os.path.dirname(DB_OUT), exist_ok=True)
    os.makedirs(JSON_DIR, exist_ok=True)

    if os.path.exists(DB_OUT):
        os.remove(DB_OUT)
    conn = sqlite3.connect(DB_OUT)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE schools (
            urn INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            phase TEXT,
            type TEXT,
            la TEXT,
            postcode TEXT,
            lat REAL,
            lng REAL,
            admissions_policy TEXT,
            mat TEXT,
            pupils INTEGER,
            age_low INTEGER,
            age_high INTEGER,
            sixth_form TEXT,
            region TEXT,
            constituency TEXT,
            idaci_quintile TEXT,
            ofsted_grade TEXT,
            ofsted_grade_label TEXT,
            ofsted_date TEXT,
            ofsted_pub_date TEXT,
            ward TEXT,
            district TEXT,
            lsoa TEXT,
            msoa TEXT
        )
    """)
    cur.execute("CREATE INDEX idx_schools_la ON schools(la)")
    cur.execute("CREATE INDEX idx_schools_phase ON schools(phase)")
    cur.execute("CREATE INDEX idx_schools_latlng ON schools(lat, lng)")

    def slugify(name, urn):
        s = "".join(c if c.isalnum() else "-" for c in name.lower())
        s = "-".join(part for part in s.split("-") if part)
        return f"{s}-{urn}"

    schools_json = []
    for r in rows:
        grade = (r.get("ofsted_grade") or "").strip()
        label = GRADE_MAP.get(grade, grade or None)
        pupils = int(r["pupils"]) if (r.get("pupils") or "").isdigit() else None
        lat = float(r["lat"]) if r.get("lat") not in (None, "", "None") else None
        lng = float(r["lng"]) if r.get("lng") not in (None, "", "None") else None
        slug = slugify(r["name"], r["urn"])

        cur.execute(
            """INSERT INTO schools VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                int(r["urn"]), r["name"], slug, r.get("phase"), r.get("type"), r.get("la"),
                r.get("postcode"), lat, lng, r.get("admissions_policy"), r.get("mat"),
                pupils,
                int(r["age_low"]) if (r.get("age_low") or "").isdigit() else None,
                int(r["age_high"]) if (r.get("age_high") or "").isdigit() else None,
                r.get("sixth_form"), r.get("region"), r.get("constituency"),
                r.get("idaci_quintile"), grade, label, r.get("ofsted_date"),
                r.get("ofsted_pub_date"), r.get("ward"), r.get("district"),
                r.get("lsoa"), r.get("msoa"),
            ),
        )

        schools_json.append({
            "urn": int(r["urn"]),
            "name": r["name"],
            "slug": slug,
            "phase": r.get("phase"),
            "type": r.get("type"),
            "la": r.get("la"),
            "postcode": r.get("postcode"),
            "lat": lat,
            "lng": lng,
            "pupils": pupils,
            "ofsted": label,
            "ofsted_grade": grade,
            "ofsted_date": r.get("ofsted_date"),
            "mat": r.get("mat") if r.get("mat") != "NULL" else None,
            "admissions_policy": r.get("admissions_policy"),
            "ward": r.get("ward"),
            "district": r.get("district"),
            "lsoa": r.get("lsoa"),
        })

    conn.commit()

    # Summary
    cur.execute("SELECT la, COUNT(*) FROM schools GROUP BY la")
    counts = dict(cur.fetchall())
    cur.execute("SELECT ofsted_grade_label, COUNT(*) FROM schools GROUP BY ofsted_grade_label")
    grades = dict(cur.fetchall())

    # Static JSON: full schools index
    with open(f"{JSON_DIR}/schools.json", "w", encoding="utf-8") as f:
        json.dump(schools_json, f, ensure_ascii=False, separators=(",", ":"))

    # Meta file for the frontend
    meta = {
        "region": "Bath & North East Somerset + Bristol",
        "schools": len(schools_json),
        "by_la": counts,
        "by_grade": grades,
        "data_as_of": "Ofsted outcomes as at 31 August 2025",
        "source": "Ofsted official statistics via gov.uk (OGL); geocoded via postcodes.io (OS OGL)",
    }
    with open(f"{JSON_DIR}/meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    conn.close()
    print(f"DB: {DB_OUT} ({os.path.getsize(DB_OUT)//1024} KB)")
    print(f"JSON: {JSON_DIR}/schools.json ({os.path.getsize(JSON_DIR + '/schools.json')//1024} KB)")
    print(f"Schools: {len(schools_json)}")
    print(f"By LA: {counts}")
    print(f"By grade: {grades}")


if __name__ == "__main__":
    main()
