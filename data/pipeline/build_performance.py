#!/usr/bin/env python3
"""Filter national KS2/KS4 files (in /tmp, downloaded by agent) to pilot URNs."""
import csv, json, os

BASE = "/Users/admin/projects/prospectus"
urns = json.load(open("/tmp/pilot_urns.json"))
PRIMARY = set(urns["primary"])
SECONDARY = set(urns["secondary"])
print(f"pilot URNs: {len(PRIMARY)} primary, {len(SECONDARY)} secondary")

perf = {}  # urn -> dict

# ---- KS2: school attainment data (2023/24 revised) ----
# columns: school_urn, breakdown_topic, breakdown, subject,
#          expected_standard_pupil_percent, higher_standard_pupil_percent, average_scaled_score
KS2 = "/tmp/ks2_zip/data/ks2_school_attainment_data.csv"
n_rows = 0
with open(KS2, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        urn = r.get("school_urn", "").strip()
        if urn not in PRIMARY:
            continue
        if r.get("breakdown_topic") != "All pupils" or r.get("breakdown") != "Total":
            continue
        subj = (r.get("subject") or "").strip()
        e = perf.setdefault(urn, {"ks2": {}, "source_label": "DfE KS2 attainment 2023/24 (revised)",
                                  "source_url": "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-2-attainment-national-experiment-statistics/2023-24"})
        def num(v):
            v = (v or "").strip()
            if v in ("", "SUPP", "NP", "x", "c", "z", ":"):
                return None
            try:
                return float(v)
            except ValueError:
                return None
        if subj == "Reading, writing and maths":
            e["ks2"]["expected_pct"] = num(r.get("expected_standard_pupil_percent"))
            e["ks2"]["higher_pct"] = num(r.get("higher_standard_pupil_percent"))
        elif subj == "Reading":
            e["ks2"]["reading_avg"] = num(r.get("average_scaled_score"))
        elif subj == "Maths":
            e["ks2"]["maths_avg"] = num(r.get("average_scaled_score"))
        n_rows += 1
print(f"KS2 matching rows: {n_rows}")

# ---- KS4: performance tables schools final (2023/24) ----
KS4 = "/tmp/ks4_zip/data/202324_performance_tables_schools_final.csv"
n4 = 0
with open(KS4, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        urn = (r.get("school_urn") or "").strip().strip('"')
        if urn not in SECONDARY:
            continue
        if (r.get("breakdown") or "").strip().strip('"') != "Total":
            continue
        def num(v):
            v = (v or "").strip().strip('"')
            if v in ("", "SUPP", "NP", "x", "c", "z", ":", "NE"):
                return None
            try:
                return float(v)
            except ValueError:
                return None
        e = perf.setdefault(urn, {"gcse": {}, "source_label": "DfE KS4 performance tables 2023/24 (revised)",
                                  "source_url": "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance-revised/2023-24"})
        e["gcse"]["attainment8"] = num(r.get("avg_att8"))
        e["gcse"]["progress8"] = num(r.get("avg_p8score"))
        e["gcse"]["ebacc_aps"] = num(r.get("avg_ebaccaps"))
        e["gcse"]["eng_maths_5plus_pct"] = num(r.get("pt_l2basics_95"))
        n4 += 1
print(f"KS4 matching rows: {n4}")

# ---- shape output ----
out_csv = os.path.join(BASE, "data/processed/pilot_performance.csv")
out_json = os.path.join(BASE, "web/public/data/performance.json")

# school names for csv
import sqlite3
conn = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
names = {str(u): (n, p) for u, n, p in conn.execute("SELECT urn, name, phase FROM schools")}

with open(out_csv, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["urn","name","phase","ks2_expected_pct","ks2_higher_pct","ks2_reading_avg","ks2_maths_avg","p8","a8","ebacc_aps","eng_maths_5plus_pct","year","source_url"])
    for urn, d in sorted(perf.items(), key=lambda x: int(x[0])):
        k = d.get("ks2", {}); g = d.get("gcse", {})
        nm, ph = names.get(urn, ("", ""))
        w.writerow([urn, nm, ph, k.get("expected_pct"), k.get("higher_pct"), k.get("reading_avg"), k.get("maths_avg"),
                    g.get("progress8"), g.get("attainment8"), g.get("ebacc_aps"), g.get("eng_maths_5plus_pct"),
                    2024, d["source_url"]])

json_out = {}
for urn, d in perf.items():
    entry = {"source_label": d["source_label"], "source_url": d["source_url"]}
    if "ks2" in d:
        entry["ks2"] = {**d["ks2"], "year": 2024}
    if "gcse" in d:
        entry["gcse"] = {**d["gcse"], "year": 2024}
    json_out[urn] = entry

with open(out_json, "w", encoding="utf-8") as f:
    json.dump(json_out, f, ensure_ascii=False, separators=(",", ":"))

ks2_cov = sum(1 for u in PRIMARY if u in perf and perf[u].get("ks2", {}).get("expected_pct") is not None)
gcse_cov = sum(1 for u in SECONDARY if u in perf and perf[u].get("gcse", {}).get("attainment8") is not None)
print(f"Wrote {out_csv}")
print(f"Wrote {out_json}")
print(f"Coverage: KS2 {ks2_cov}/{len(PRIMARY)} primary, GCSE {gcse_cov}/{len(SECONDARY)} secondary")
