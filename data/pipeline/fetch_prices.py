#!/usr/bin/env python3
"""Fetch Land Registry PPD transactions for pilot school postcodes via SPARQL,
aggregate to postcode-district level. Real data only."""
import json, sqlite3, time, urllib.request, urllib.parse, csv, os, statistics

BASE = "/Users/admin/projects/prospectus"
ENDPOINT = "http://landregistry.data.gov.uk/landregistry/query"

conn = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
rows = conn.execute("SELECT DISTINCT postcode FROM schools WHERE postcode IS NOT NULL").fetchall()
postcodes = sorted({r[0].strip() for r in rows if r[0] and r[0].strip()})
print(f"unique school postcodes: {len(postcodes)}")

QUERY_TMPL = """
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?postcode ?amount ?date ?ptype WHERE {
  VALUES ?postcode { %s }
  ?addr lrcommon:postcode ?postcode .
  ?transx lrppi:propertyAddress ?addr ;
          lrppi:pricePaid ?amount ;
          lrppi:transactionDate ?date .
  OPTIONAL { ?addr lrcommon:propertyType ?ptype }
}
ORDER BY DESC(?date)
LIMIT 2000
"""

def run_query(pcs, attempt=1):
    values = " ".join(f'"{pc}"^^xsd:string' for pc in pcs)
    q = QUERY_TMPL % values
    data = urllib.parse.urlencode({"query": q, "format": "application/sparql-results+json"}).encode()
    req = urllib.request.Request(ENDPOINT, data=data, headers={
        "Accept": "application/sparql-results+json",
        "User-Agent": "SchoolPlacePilot/0.1 (research; contact: local)"})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        if attempt < 3:
            time.sleep(3 * attempt)
            return run_query(pcs, attempt + 1)
        print(f"  FAILED batch starting {pcs[0]}: {e}")
        return None

txns = []  # (postcode, price, date, type)
BATCH = 40
for i in range(0, len(postcodes), BATCH):
    batch = postcodes[i:i+BATCH]
    res = run_query(batch)
    if res:
        for b in res.get("results", {}).get("bindings", []):
            try:
                if b["date"]["value"][:4] < "2024":
                    continue
                txns.append((
                    b["postcode"]["value"],
                    float(b["amount"]["value"]),
                    b["date"]["value"][:10],
                    (b.get("ptype", {}) or {}).get("value", ""),
                ))
            except (KeyError, ValueError):
                pass
    print(f"  {min(i+BATCH, len(postcodes))}/{len(postcodes)} postcodes, {len(txns)} transactions")
    time.sleep(1.2)

print(f"total transactions: {len(txns)}")

# aggregate by outward district
by_d = {}
for pc, price, date, ptype in txns:
    d = pc.split()[0].upper()
    by_d.setdefault(d, []).append((price, ptype))

def median(vals):
    return round(statistics.median(vals)) if vals else None

districts = {}
for d, items in sorted(by_d.items()):
    prices = sorted(p for p, _ in items)
    n = len(prices)
    types = {}
    for label, keys in (("detached", "detached"), ("semi", "semi-detached"),
                        ("terraced", "terraced"), ("flat", "flat/maisonette")):
        tv = [p for p, t in items if keys in (t or "").lower()]
        if tv:
            types[label] = median(tv)
    districts[d] = {
        "transactions": n,
        "median": median(prices),
        "mean": round(sum(prices) / n),
        "p25": prices[n // 4],
        "p75": prices[(3 * n) // 4],
        "by_type": types,
        "period": "Jan 2024 – present",
    }

all_prices = sorted(t[1] for t in txns)
if all_prices:
    districts["_pilot"] = {
        "transactions": len(all_prices),
        "median": median(all_prices),
        "mean": round(sum(all_prices) / len(all_prices)),
    }
districts["_meta"] = {
    "source": "HM Land Registry Price Paid Data (SPARQL)",
    "source_url": "http://landregistry.data.gov.uk/landregistry/query",
    "note": "Transactions at postcodes of pilot schools, aggregated to postcode district. Not a full-district census.",
}

os.makedirs(os.path.join(BASE, "data/processed"), exist_ok=True)
with open(os.path.join(BASE, "data/processed/pilot_prices.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["district","transactions","median","mean","p25","p75","detached_med","semi_med","terraced_med","flat_med","period_from","period_to"])
    for d, v in districts.items():
        if d.startswith("_"):
            continue
        w.writerow([d, v["transactions"], v["median"], v["mean"], v["p25"], v["p75"],
                    v["by_type"].get("detached"), v["by_type"].get("semi"),
                    v["by_type"].get("terraced"), v["by_type"].get("flat"), "2024-01-01", ""])

with open(os.path.join(BASE, "web/public/data/prices.json"), "w", encoding="utf-8") as f:
    json.dump(districts, f, ensure_ascii=False, separators=(",", ":"))

print(f"districts with data: {len([d for d in districts if not d.startswith('_')])}")
print(json.dumps({k: v for k, v in list(districts.items())[:3]}, indent=1)[:600])
