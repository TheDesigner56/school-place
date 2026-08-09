import sqlite3, re, json

conn = sqlite3.connect('data/processed/pilot.db')
cur = conn.cursor()
cur.execute("SELECT postcode FROM schools WHERE postcode IS NOT NULL AND postcode != ''")
pcs = [r[0] for r in cur.fetchall()]
districts = set()
for pc in pcs:
    m = re.match(r'^([A-Z]{1,2}[0-9][0-9A-Z]?)', pc.strip().upper())
    if m:
        districts.add(m.group(1))
ds = sorted(districts)
print('POSTCODE DISTRICTS:', len(ds))
print(json.dumps(ds))

# Count schools per district
counts = {}
cur.execute("SELECT postcode FROM schools WHERE postcode IS NOT NULL AND postcode != ''")
for (pc,) in cur.fetchall():
    m = re.match(r'^([A-Z]{1,2}[0-9][0-9A-Z]?)', pc.strip().upper())
    if m:
        d = m.group(1)
        counts[d] = counts.get(d, 0) + 1
for d in ds:
    print(f"  {d}: {counts.get(d,0)} schools")