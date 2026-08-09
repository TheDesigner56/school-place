#!/usr/bin/env python3
"""Build performance_history.json: 2 years KS2 (2022/23 + 2023/24 from the same file),
plus 2023/24 KS4. Merges with existing performance.json values."""
import csv, json, os, sqlite3

BASE = "/Users/admin/projects/prospectus"
conn0 = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
PRIMARY = {str(u) for (u,) in conn0.execute("SELECT urn FROM schools WHERE phase='Primary'")}
SECONDARY = {str(u) for (u,) in conn0.execute("SELECT urn FROM schools WHERE phase='Secondary'")}
conn0.close()

def num(v):
    v = (v or "").strip().strip('"')
    if v in ("", "SUPP", "NP", "x", "c", "z", ":", "NE", "NA"):
        return None
    try: return float(v)
    except ValueError: return None

hist = {}  # urn -> {"ks2": {year: {...}}, "gcse": {year: {...}}}

# KS2 file: has time_period column (202223 / 202324)
KS2 = "/tmp/ks2_zip/data/ks2_school_attainment_data.csv"
with open(KS2, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        urn = (r.get("school_urn") or "").strip()
        if urn not in PRIMARY: continue
        if r.get("breakdown_topic") != "All pupils" or r.get("breakdown") != "Total": continue
        tp = (r.get("time_period") or "").strip()
        year = 2000 + int(tp[4:6]) if tp.isdigit() and len(tp) == 6 else None  # 202223 -> 2023
        if year not in (2023, 2024): continue
        subj = (r.get("subject") or "").strip()
        e = hist.setdefault(urn, {}).setdefault("ks2", {}).setdefault(year, {})
        if subj == "Reading, writing and maths":
            e["expected_pct"] = num(r.get("expected_standard_pupil_percent"))
            e["higher_pct"] = num(r.get("higher_standard_pupil_percent"))

# KS4: 2023/24 only (school-level file for 2022/23 not yet fetched)
KS4 = "/tmp/ks4_zip/data/202324_performance_tables_schools_final.csv"
with open(KS4, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        urn = (r.get("school_urn") or "").strip().strip('"')
        if urn not in SECONDARY: continue
        if (r.get("breakdown") or "").strip().strip('"') != "Total": continue
        e = hist.setdefault(urn, {}).setdefault("gcse", {}).setdefault(2024, {})
        e["attainment8"] = num(r.get("avg_att8"))
        e["progress8"] = num(r.get("avg_p8score"))
        e["eng_maths_5plus_pct"] = num(r.get("pt_l2basics_95"))

# shape output
conn = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
names = {str(u): (n, p) for u, n, p in conn.execute("SELECT urn, name, phase FROM schools")}

out_csv = os.path.join(BASE, "data/processed/pilot_performance_history.csv")
with open(out_csv, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["urn","name","phase","year","expected_pct","higher_pct","a8","p8"])
    for urn, d in sorted(hist.items(), key=lambda x: int(x[0])):
        nm, ph = names.get(urn, ("",""))
        for yr, v in sorted(d.get("ks2", {}).items()):
            w.writerow([urn, nm, ph, yr, v.get("expected_pct"), v.get("higher_pct"), "", ""])
        for yr, v in sorted(d.get("gcse", {}).items()):
            w.writerow([urn, nm, ph, yr, "", "", v.get("attainment8"), v.get("progress8")])

json_out = {}
for urn, d in hist.items():
    entry = {}
    if "ks2" in d:
        years = [{"year": y, "expected_pct": v.get("expected_pct"), "higher_pct": v.get("higher_pct")}
                 for y, v in sorted(d["ks2"].items(), reverse=True)]
        entry["ks2"] = {"years": years}
    if "gcse" in d:
        years = [{"year": y, "attainment8": v.get("attainment8"), "progress8": v.get("progress8"), "eng_maths_5plus_pct": v.get("eng_maths_5plus_pct")}
                 for y, v in sorted(d["gcse"].items(), reverse=True)]
        entry["gcse"] = {"years": years}
    entry["source_label"] = "DfE attainment (revised)"
    entry["source_url"] = "https://explore-education-statistics.service.gov.uk/"
    json_out[urn] = entry

with open(os.path.join(BASE, "web/public/data/performance_history.json"), "w", encoding="utf-8") as f:
    json.dump(json_out, f, ensure_ascii=False, separators=(",", ":"))

ks2_23 = sum(1 for u in PRIMARY if hist.get(u,{}).get("ks2",{}).get(2023,{}).get("expected_pct") is not None)
ks2_24 = sum(1 for u in PRIMARY if hist.get(u,{}).get("ks2",{}).get(2024,{}).get("expected_pct") is not None)
gcse_24 = sum(1 for u in SECONDARY if hist.get(u,{}).get("gcse",{}).get(2024,{}).get("attainment8") is not None)
print(f"KS2 2022/23: {ks2_23}/{len(PRIMARY)} | KS2 2023/24: {ks2_24}/{len(PRIMARY)} | GCSE 2023/24: {gcse_24}/{len(SECONDARY)}")
print("wrote", out_csv, "and performance_history.json")
