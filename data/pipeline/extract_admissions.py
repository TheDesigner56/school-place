#!/usr/bin/env python3
"""Extract B&NES allocation statements (2024, 2025) from bathnes.gov.uk.
Statement pages -> PDF hrefs -> download -> pypdf -> regex fields -> match pilot.db.
Bristol: name-list only (PDFs not archived) handled separately."""
import re, os, time, json, sqlite3, urllib.request, urllib.parse

BASE = "/Users/admin/projects/prospectus"
RAW = os.path.join(BASE, "data/raw/admissions")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# Archive timestamps for the listing pages (statement pages share the crawl window)
ARCHIVE_TS = {"2025": "20250420041258", "2024": "20250119020500"}

def fetch(url, binary=False, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", errors="replace")

def get_statement_page(slug, year):
    """Archive first (live bathnes.gov.uk is a JS shell with no PDF links)."""
    arch = f"https://web.archive.org/web/{ARCHIVE_TS[year]}id_/https://www.bathnes.gov.uk{slug}"
    try:
        html = fetch(arch)
        if ".pdf" in html:
            return html, arch
    except Exception:
        pass
    live = f"https://www.bathnes.gov.uk{slug}"
    try:
        return fetch(live), live
    except Exception as e:
        print(f"  page FAIL {slug[:50]}: {e}")
        return None, None

def get_pdf(pdf_path, year="2025"):
    """pdf_path is relative /sites/default/files/... — archive first (live is unreliable)."""
    if pdf_path.startswith("/web/"):  # archive-rewritten href
        url = "https://web.archive.org" + pdf_path
    elif pdf_path.startswith("http"):
        url = pdf_path
    else:
        url = f"https://web.archive.org/web/{ARCHIVE_TS[year]}id_/https://www.bathnes.gov.uk{pdf_path}"
    try:
        return fetch(url, binary=True), url
    except Exception:
        live = "https://www.bathnes.gov.uk" + (pdf_path if pdf_path.startswith("/") else "/" + pdf_path)
        try:
            return fetch(live, binary=True), live
        except Exception as e:
            print(f"  pdf FAIL {pdf_path[-60:]}: {e}")
            return None, None

def parse_pdf_text(path):
    from pypdf import PdfReader
    r = PdfReader(path)
    return "\n".join((p.extract_text() or "") for p in r.pages)

def extract_fields(text):
    t = re.sub(r"\s+", " ", text)
    pan = None
    m = re.search(r"PLACES AVAILABLE[:\s]+(\d+)", t, re.I)
    if m: pan = int(m.group(1))
    dist_m = None
    m = re.search(r"furthest[^.]*?distance[^.]*?was\s+([\d.]+)\s*miles", t, re.I)
    if not m:
        m = re.search(r"([\d.]+)\s*miles", t, re.I)
    if m:
        dist_m = round(float(m.group(1)) * 1609.34)
    crit = None
    m = re.search(r"Category\s+(\d+)", t, re.I)
    if m: crit = f"Category {m.group(1)}"
    if re.search(r"met the school.s admission number|all applicants", t, re.I):
        if crit is None: crit = "all applicants"
    oversub = bool(re.search(r"oversubscribed|more applications than|did not meet", t, re.I))
    return pan, dist_m, crit, oversub

# name from slug: /policy-and-documents-library/bathwick-st-marys-church-school-allocation-statement-and-app...
def slug_to_name(slug):
    s = slug.rstrip("/").split("/")[-1]
    s = re.sub(r"-(allocation-statement|and-appeal|appeal-form|-202\d|\d).*$", "", s, flags=re.I)
    return s.replace("-", " ").strip()

def norm(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]", "", s)
    s = re.sub(r"\b(st|saint)\b", "st", s)
    s = re.sub(r"\b(church of england|ce|c of e|voluntary aided|va|educate together|et|primary academy|academy|primary school|primary|church school|school)\b", "", s)
    return re.sub(r"\s+", " ", s).strip()

conn = sqlite3.connect(os.path.join(BASE, "data/processed/pilot.db"))
banes = conn.execute("SELECT urn, name, phase FROM schools WHERE la='Bath and North East Somerset'").fetchall()
def match_urn(name_guess):
    ng = norm(name_guess)
    best, score = None, 0
    for urn, nm, ph in banes:
        nn = norm(nm)
        # token overlap
        a, b = set(ng.split()), set(nn.split())
        if not a or not b: continue
        ov = len(a & b) / max(len(a), len(b))
        if ov > score:
            best, score = (urn, nm, ph), ov
    return best if score >= 0.5 else (None, name_guess, None)

records = []
for year in ("2025", "2024"):
    html = open(os.path.join(RAW, f"bathnes_primary_{year}.html"), encoding="utf-8", errors="replace").read()
    slugs = sorted(set(re.findall(r'href="(/policy-and-documents-library/[^"]*allocation-statement[^"]*)"', html)))
    print(f"{year}: {len(slugs)} statement pages")
    for slug in slugs:
        guess = slug_to_name(slug)
        page, page_url = get_statement_page(slug, year)
        if not page:
            continue
        pdfs = re.findall(r'href="([^"]*\.pdf[^"]*)"', page, re.I)
        # prefer 'allocation statement' pdf, not appeal form
        alloc = [p for p in pdfs if "appeal" not in p.lower()]
        pdf_path = (alloc or pdfs or [None])[0]
        if not pdf_path:
            print(f"  no pdf: {guess}")
            continue
        blob, pdf_url = get_pdf(pdf_path, year)
        if not blob:
            continue
        tmp = os.path.join(RAW, f"_stmt_{year}_{abs(hash(pdf_path))%99999}.pdf")
        with open(tmp, "wb") as f:
            f.write(blob)
        try:
            text = parse_pdf_text(tmp)
            pan, dist_m, crit, oversub = extract_fields(text)
        except Exception as e:
            print(f"  parse FAIL {guess}: {e}")
            pan = dist_m = crit = None; oversub = False
        (urn, matched_name, ph) = match_urn(guess)
        records.append({
            "urn": urn, "name": matched_name, "la": "Bath and North East Somerset",
            "phase": ph, "intake_year": int(year), "pan": pan,
            "applications": None, "offers": None, "oversubscribed": oversub,
            "last_distance_m": dist_m, "criterion_met": crit,
            "source_url": page_url or pdf_url or "",
        })
        print(f"  {year} {guess[:35]:35s} -> urn={urn} pan={pan} dist={dist_m} crit={crit}")
        os.remove(tmp)
        time.sleep(0.8)

# write CSV
out_csv = os.path.join(BASE, "data/processed/pilot_admissions.csv")
import csv as csvmod
with open(out_csv, "w", newline="", encoding="utf-8") as f:
    w = csvmod.writer(f)
    w.writerow(["urn","name","la","phase","intake_year","pan","applications","offers","oversubscribed","last_distance_m","criterion_met","source_url"])
    for r in records:
        w.writerow([r["urn"], r["name"], r["la"], r["phase"], r["intake_year"], r["pan"],
                    r["applications"], r["offers"], r["oversubscribed"], r["last_distance_m"],
                    r["criterion_met"], r["source_url"]])

# write JSON keyed by urn (only matched)
json_out = {}
for r in records:
    if not r["urn"]:
        continue
    e = json_out.setdefault(str(r["urn"]), {
        "name": r["name"], "la": r["la"], "years": [],
        "source_label": "B&NES allocation statement", "source_url": r["source_url"]})
    e["years"].append({
        "year": r["intake_year"], "pan": r["pan"], "applications": r["applications"],
        "offers": r["offers"], "oversubscribed": r["oversubscribed"],
        "last_distance_m": r["last_distance_m"], "criterion_met": r["criterion_met"]})

out_json = os.path.join(BASE, "web/public/data/admissions.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(json_out, f, ensure_ascii=False, separators=(",", ":"))

matched = sum(1 for r in records if r["urn"])
with_dist = sum(1 for r in records if r["last_distance_m"])
print(f"\nrecords={len(records)} matched={matched} with_distance={with_dist}")
print(f"wrote {out_csv}")
print(f"wrote {out_json}")
