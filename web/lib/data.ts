/**
 * Static data helpers — all data is read from /public/data/*.json at build time.
 * Uses fs (server-only, RSC). Client components fetch /data/*.json directly.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { School } from "./utils";

const DATA_DIR = path.join(process.cwd(), "public", "data");

function readJson<T>(file: string): T {
  const full = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(full, "utf-8");
  return JSON.parse(raw) as T;
}

export async function getSchools(): Promise<School[]> {
  return readJson<School[]>("schools.json");
}

export async function getSchoolBySlug(slug: string): Promise<School | undefined> {
  const schools = await getSchools();
  return schools.find((s) => s.slug === slug);
}

export async function getSchoolsInDistrict(district: string): Promise<School[]> {
  const schools = await getSchools();
  const d = district.toLowerCase();
  return schools.filter((s) => (s.postcode.trim().split(/\s+/)[0] ?? "").toLowerCase() === d);
}

export async function getAllDistricts(): Promise<string[]> {
  const schools = await getSchools();
  const set = new Set<string>();
  for (const s of schools) {
    const d = (s.postcode.trim().split(/\s+/)[0] ?? "").toLowerCase();
    if (d) set.add(d);
  }
  return Array.from(set).sort();
}

export type Meta = {
  region: string;
  schools: number;
  by_la: Record<string, number>;
  by_grade: Record<string, number>;
  data_as_of: string;
  source: string;
};

export async function getMeta(): Promise<Meta> {
  return readJson<Meta>("meta.json");
}

export type LsoaCrime = { total: number; by_category: Record<string, number> };

export async function getCrime(): Promise<Record<string, LsoaCrime>> {
  return readJson<Record<string, LsoaCrime>>("crime.json");
}

export type Ks2Perf = { expected_pct: number | null; higher_pct: number | null; reading_avg?: number | null; maths_avg?: number | null; year: number };
export type GcsePerf = { progress8: number | null; attainment8: number | null; ebacc_aps: number | null; eng_maths_5plus_pct: number | null; year: number };
export type SchoolPerf = { ks2?: Ks2Perf; gcse?: GcsePerf; source_label: string; source_url: string };

export async function getPerformance(): Promise<Record<string, SchoolPerf>> {
  return readJson<Record<string, SchoolPerf>>("performance.json");
}

export type DistrictPrices = {
  transactions: number; median: number | null; mean: number | null;
  p25: number | null; p75: number | null;
  by_type: Record<string, number>; period: string;
};

export async function getPrices(): Promise<Record<string, DistrictPrices>> {
  return readJson<Record<string, DistrictPrices>>("prices.json");
}

export type AdmissionYear = {
  year: number; pan: number | null; applications: number | null; offers: number | null;
  oversubscribed: boolean; last_distance_m: number | null; criterion_met: string | null;
};
export type SchoolAdmissions = { name: string; la: string; years: AdmissionYear[]; source_label: string; source_url: string };

export async function getAdmissions(): Promise<Record<string, SchoolAdmissions>> {
  return readJson<Record<string, SchoolAdmissions>>("admissions.json");
}

export type OfstedInspection = {
  date: string | null; publication_date: string | null; type?: string | null;
  overall: string | null; sub?: Record<string, string | null> | null;
};
export type OfstedFull = {
  report_url: string | null;
  latest: OfstedInspection;
  previous: { date: string | null; publication_date: string | null; overall: string | null } | null;
  idaci_quintile: string | null;
  report_card_2026?: { inspection_date: string | null; sub_judgements: Record<string, string> | null };
  source_label: string; source_url: string;
};

export async function getOfstedFull(): Promise<Record<string, OfstedFull>> {
  return readJson<Record<string, OfstedFull>>("ofsted_full.json");
}

export type Characteristics = {
  fsm_pct: number | null; sen_pct: number | null; eal_pct: number | null;
  girls_pct: number | null; boys_pct?: number | null; class_size_avg: number | null;
  pupils_on_roll: number | null; ethnicity?: Record<string, number>;
  year: number; source_label: string; source_url: string;
};

export async function getCharacteristics(): Promise<Record<string, Characteristics>> {
  return readJson<Record<string, Characteristics>>("characteristics.json");
}

export type PerfYear = { year: number; expected_pct?: number | null; higher_pct?: number | null; attainment8?: number | null; progress8?: number | null };
export type PerfHistory = {
  ks2?: { years: PerfYear[] }; gcse?: { years: PerfYear[] };
  source_label: string; source_url: string;
};

export async function getPerformanceHistory(): Promise<Record<string, PerfHistory>> {
  return readJson<Record<string, PerfHistory>>("performance_history.json");
}