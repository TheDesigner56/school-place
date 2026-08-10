#!/usr/bin/env python3
"""Build NATIONAL performance data (all England schools) for School Place.

KS2: 2022/23, 2023/24, 2024/25 school-level attainment (All pupils / Total).
KS4: 2023/24, 2024/25 school-level performance tables (breakdown=Total).
     2022/23 KS4 skipped: no school-level file in that release (known gap).

Outputs:
  web/public/data/performance.json          (2024/25 primary, 2023/24 fallback)
  web/public/data/performance_history.json  (all years per school)
  data/processed/national_performance.csv   (urn,name,phase,year,metrics)
"""
import csv, json, os, sqlite3

BASE = "/Users/admin/projects/prospectus"
OUT_DIR = os.path.join(BASE, "web/public/data")
PROC_DIR = os.path.join(BASE, "data/processed")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PROC_DIR, exist_ok=True)

SUPPRESS = {"", "SUPP", "NP", "x", "c", "z", ":", "NE", "NA", "lowcoverage"}

def num(v):
    v = (v or "").strip().strip('"')
    if v in SUPPRESS:
        return None
    try:
        return float(v)
    except ValueError:
        return None

def year_from_tp(tp):
    tp = (tp or "").strip()
    if tp.isdigit() and len(tp) == 6:
        return 2000 + int(tp[4:6])
    return None

# urn -> {"ks2": {year: {...}}, "gcse": {year: {...}}, "name": ..., "phase": ...}
data = {}

def ks2_row(r):
    urn = (r.get("school_urn") or "").strip()
    if not urn:
        return
    if r.get("breakdown_topic") != "All pupils" or r.get("breakdown") != "Total":
        return
    year = year_from_tp(r.get("time_period"))
    if year not in (2023, 2024, 2025):
        return
    subj = (r.get("subject") or "").strip()
    e = data.setdefault(urn, {}).setdefault("ks2", {}).setdefault(year, {})
    if subj == "Reading, writing and maths":
        e["expected_pct"] = num(r.get("expected_standard_pupil_percent"))
        e["higher_pct"] = num(r.get("higher_standard_pupil_percent"))
    elif subj == "Reading":
        e["reading_avg"] = num(r.get("average_scaled_score"))
    elif subj == "Maths":
        e["maths_avg"] = num(r.get("average_scaled_score"))
    if not data[urn].get("name") and r.get("school_name"):
        data[urn]["name"] = r["school_name"].strip()

def ks4_row(r, year):
    urn = (r.get("school_urn") or "").strip().strip('"')
    if not urn:
        return
    if (r.get("breakdown") or "").strip().strip('"') != "Total":
        return
    e = data.setdefault(urn, {}).setdefault("gcse", {}).setdefault(year, {})
    # 2023/24 file uses avg_att8/avg_p8score/avg_ebaccaps/pt_l2basics_95;
    # 2024/25 file uses attainment8_average/progress8_average/ebacc_aps_average/engmath_95_percent
    e["attainment8"] = num(r.get("avg_att8") or r.get("attainment8_average"))
    e["progress8"] = num(r.get("avg_p8score") or r.get("progress8_average"))
    e["ebacc_aps"] = num(r.get("avg_ebaccaps") or r.get("ebacc_aps_average"))
    e["eng_maths_5plus_pct"] = num(r.get("pt_l2basics_95") or r.get("engmath_95_percent"))
    if not data[urn].get("name") and r.get("school_name"):
        data[urn]["name"] = r["school_name"].strip()

# ---- KS2: 2022/23 + 2023/24 (existing file) ----
KS2_2324 = "/tmp/ks2_zip/data/ks2_school_attainment_data.csv"
n = 0
with open(KS2_2324, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        ks2_row(r)
        n += 1
print(f"KS2 2022/23+2023/24 file: {n} rows scanned")

# ---- KS2: 2024/25 (extracted from /tmp/ks2_2025.zip) ----
KS2_25 = "/tmp/ks2_2025_ext/data/ks2_school_attainment_data.csv"
n = 0
with open(KS2_25, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        ks2_row(r)
        n += 1
print(f"KS2 2024/25 file: {n} rows scanned")

# ---- KS4: 2023/24 ----
KS4_24 = "/tmp/ks4_zip/data/202324_performance_tables_schools_final.csv"
n = 0
with open(KS4_24, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        ks4_row(r, 2024)
        n += 1
print(f"KS4 2023/24 file: {n} rows scanned")

# ---- KS4: 2024/25 (extracted from /tmp/national/ks4_2025.zip) ----
KS4_25 = "/tmp/ks4_2025_ext/data/202425_performance_tables_schools_final.csv"
n = 0
with open(KS4_25, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        ks4_row(r, 2025)
        n += 1
print(f"KS4 2024/25 file: {n} rows scanned")

# ---- names/phase from pilot.db (no national.db exists) ----
conn = sqlite3.connect(os.path.join(PROC_DIR, "pilot.db"))
db_names = {str(u): (n, p) for u, n, p in conn.execute("SELECT urn, name, phase FROM schools")}
conn.close()
for urn, d in data.items():
    if urn in db_names:
        d["name"], d["phase"] = db_names[urn]
    else:
        d.setdefault("name", "")
        d.setdefault("phase", "")

# ---- source labels/urls ----
SRC = {
    "ks2": {
        2023: ("DfE KS2 attainment 2022/23 (revised)",
               "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-2-attainment-national-experiment-statistics/2022-23"),
        2024: ("DfE KS2 attainment 2023/24 (revised)",
               "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-2-attainment-national-experiment-statistics/2023-24"),
        2025: ("DfE KS2 attainment 2024/25 (revised)",
               "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-2-attainment-national-experiment-statistics/2024-25"),
    },
    "gcse": {
        2024: ("DfE KS4 performance tables 2023/24 (revised)",
               "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance-revised/2023-24"),
        2025: ("DfE KS4 performance tables 2024/25 (revised)",
               "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance-revised/2024-25"),
    },
}

# ---- performance.json: 2024/25 primary, 2023/24 fallback ----
perf = {}
for urn, d in data.items():
    entry = {}
    ks2 = d.get("ks2", {})
    gcse = d.get("gcse", {})
    if ks2:
        yr = 2025 if 2025 in ks2 else 2024
        entry["ks2"] = {**ks2[yr], "year": yr}
        entry["source_label"], entry["source_url"] = SRC["ks2"][yr]
    if gcse:
        yr = 2025 if 2025 in gcse else 2024
        entry["gcse"] = {**gcse[yr], "year": yr}
        if "ks2" not in entry:
            entry["source_label"], entry["source_url"] = SRC["gcse"][yr]
    if entry:
        perf[urn] = entry

with open(os.path.join(OUT_DIR, "performance.json"), "w", encoding="utf-8") as f:
    json.dump(perf, f, ensure_ascii=False, separators=(",", ":"))

# ---- performance_history.json: all years ----
hist = {}
for urn, d in data.items():
    entry = {}
    if d.get("ks2"):
        years = [{"year": y, "expected_pct": v.get("expected_pct"), "higher_pct": v.get("higher_pct")}
                 for y, v in sorted(d["ks2"].items(), reverse=True)]
        entry["ks2"] = {"years": years}
    if d.get("gcse"):
        years = [{"year": y, "attainment8": v.get("attainment8"), "progress8": v.get("progress8"),
                  "eng_maths_5plus_pct": v.get("eng_maths_5plus_pct")}
                 for y, v in sorted(d["gcse"].items(), reverse=True)]
        entry["gcse"] = {"years": years}
    entry["source_label"] = "DfE attainment (revised)"
    entry["source_url"] = "https://explore-education-statistics.service.gov.uk/"
    hist[urn] = entry

with open(os.path.join(OUT_DIR, "performance_history.json"), "w", encoding="utf-8") as f:
    json.dump(hist, f, ensure_ascii=False, separators=(",", ":"))

# ---- national_performance.csv ----
csv_path = os.path.join(PROC_DIR, "national_performance.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["urn", "name", "phase", "year", "expected_pct", "higher_pct", "a8", "p8",
                "eng_maths_5plus_pct", "source_url"])
    for urn in sorted(data.keys(), key=lambda x: int(x)):
        d = data[urn]
        for yr in sorted(set(d.get("ks2", {})) | set(d.get("gcse", {}))):
            k = d.get("ks2", {}).get(yr, {})
            g = d.get("gcse", {}).get(yr, {})
            url = SRC["ks2"].get(yr, SRC["gcse"].get(yr, ("", "")))[1]
            w.writerow([urn, d.get("name", ""), d.get("phase", ""), yr,
                        k.get("expected_pct"), k.get("higher_pct"),
                        g.get("attainment8"), g.get("progress8"),
                        g.get("eng_maths_5plus_pct"), url])

# ---- verification ----
def cov_ks2(year, metric="expected_pct"):
    return sum(1 for d in data.values() if d.get("ks2", {}).get(year, {}).get(metric) is not None)

def cov_gcse(year, metric="attainment8"):
    return sum(1 for d in data.values() if d.get("gcse", {}).get(year, {}).get(metric) is not None)

print("\n=== COVERAGE ===")
print(f"KS2 2022/23 expected_pct: {cov_ks2(2023)}")
print(f"KS2 2023/24 expected_pct: {cov_ks2(2024)}")
print(f"KS2 2024/25 expected_pct: {cov_ks2(2025)}")
print(f"KS2 2024/25 reading_avg:  {cov_ks2(2025, 'reading_avg')}")
print(f"KS2 2024/25 maths_avg:    {cov_ks2(2025, 'maths_avg')}")
print(f"KS4 2023/24 attainment8:  {cov_gcse(2024)}")
print(f"KS4 2024/25 attainment8:  {cov_gcse(2025)}")
print(f"KS4 2024/25 progress8:    {cov_gcse(2025, 'progress8')}")
print(f"KS4 2024/25 eng_maths:    {cov_gcse(2025, 'eng_maths_5plus_pct')}")
print(f"Total URNs in data: {len(data)}")
print(f"performance.json entries: {len(perf)}")
print(f"performance_history.json entries: {len(hist)}")

# pilot cross-check
pilot = json.load(open(os.path.join(PROC_DIR, "pilot_urns.json")))
pilot_urns = set(pilot.keys())
missing = pilot_urns - set(perf.keys())
print(f"\nPilot URNs: {len(pilot_urns)} | in performance.json: {len(pilot_urns & set(perf.keys()))} | missing: {len(missing)}")
if missing:
    print("missing sample:", sorted(missing)[:10])

for p in (os.path.join(OUT_DIR, "performance.json"), os.path.join(OUT_DIR, "performance_history.json"), csv_path):
    print(f"{p}: {os.path.getsize(p):,} bytes")
