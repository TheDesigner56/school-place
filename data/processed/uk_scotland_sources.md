# Scotland data sources (School Place)
All downloaded 10 Aug 2026.

## Register (with coordinates + SIMD!)
- Scottish Government 'School contact details' / school roll:
  SG_SchoolRoll_2023_Table.zip (statistics.gov.scot / data.gov.uk)
  -> uk_scotland_schools.csv: 2,483 schools with SEED code, address, postcode,
  LA, DataZone, UPRN, denomination, FTE teacher, pupil roll, % minority ethnic,
  % 20% most deprived, SIMD percentiles, urban/rural 6/8-fold, grid ref, lat/lng.

## Attainment
- statistics.gov.scot 'Attainment for all senior phase' (attainment-for-all.csv):
  school-level Average Total Tariff Score, SCQF level awards, latest year per school
  -> uk_scotland_attainment.csv
- 'Positive destinations' (positive-destinations.csv): % leavers in positive
  destination per school -> uk_scotland_destinations.csv
- Also staged: literacy-and-numeracy.csv, breadth-and-depth.csv (93MB),
  attainment-by-deprivation-quintile.csv, leaver-count.csv

## Gaps
- Education Scotland inspection index: agent was mid-walk of
  educationinspectorate.gov.scot/find-an-inspection-report/ (JS-driven) when it
  hit limits — not yet parsed.
