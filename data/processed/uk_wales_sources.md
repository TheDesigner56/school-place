# Wales data sources (School Place)
All downloaded 10 Aug 2026.

## Register + pupil data
- **StatsWales migrated to stats.gov.wales** (old statswales.gov.wales API is dead).
- New API v2: `api.stat.gov.wales` (Swagger at /swagger/index.html).
- School register with pupil numbers, LA, sector, type, governance, language:
  dataset 'School register' via api.stat.gov.wales (raw: /tmp/wales/register_raw.csv, 1,440 schools).
- Pupil numbers by school/year/sector: plasc_by_school.csv (20.9MB)
- FSM eligible by school: fsm_by_school.csv
- ALN by school: aln_by_school.csv
- Pupils by year group: pupils_by_yeargroup.csv
- Budgets by school: budgets_by_school.csv
- Independent schools: independent_by_school.csv

## Gaps
- No lat/lng in register — geocoding needed (later step).
- No school-level attainment downloaded yet (KS2/KS4 equivalents) — StatsWales has
  attainment datasets; next iteration.
- Estyn inspection index not yet pulled.
