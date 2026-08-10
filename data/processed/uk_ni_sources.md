# Northern Ireland data sources (School Place)
All downloaded 10 Aug 2026.

## Register (with coordinates!)
- opendatani.gov.uk is a PortalJS frontend over CKAN.
- 'Schools in Northern Ireland' / locate-a-school dataset via CKAN API:
  raw: /tmp/ni_scratch/locate_schools.csv — 1,555 schools with Reference, name,
  address, postcode, Institution_Type, Management_Type, Latitude, Longitude,
  Current_Approved_Enrolment, Pupil_Teacher_Ratio.

## Performance
- SAER (School Annual Exam Results) 2024/25: /tmp/ni_scratch/saer_2425.csv
  (also .ods) — GCSE 5+ A*-C incl Eng/Maths, A-level 3+ A-C per school.

## Gaps
- ETI inspection index partially explored (etini.gov.uk publications pages
  staged in /tmp/ni_scratch/eti_*.html) — not yet parsed into a CSV.
- Enrolment time series (enrol_schools.csv) is aggregate by management type,
  not school-level — skipped.
