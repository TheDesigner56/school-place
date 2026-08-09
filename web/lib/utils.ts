import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type School = {
  urn: number;
  name: string;
  slug: string;
  phase: "Nursery" | "Primary" | "Secondary" | "Special" | "PRU";
  type: string;
  la: string;
  postcode: string;
  lat: number;
  lng: number;
  pupils: number | null;
  ofsted: "Outstanding" | "Good" | "Requires Improvement" | "Inadequate" | "Not judged" | "NULL" | null;
  ofsted_grade: string | null;
  ofsted_date: string | null;
  mat: string | null;
  admissions_policy: string | null;
  ward: string | null;
  district: string | null;
  lsoa: string | null;
};

export type OfstedGrade = NonNullable<School["ofsted"]>;

export const OFSTED_ORDER: OfstedGrade[] = [
  "Outstanding",
  "Good",
  "Requires Improvement",
  "Inadequate",
  "Not judged",
];

export const PHASES = ["Nursery", "Primary", "Secondary", "Special", "PRU"] as const;

/** Map Ofsted value → CSS var token name. "NULL" treated as Not judged. */
export function ofstedToken(ofsted: School["ofsted"]): string {
  const g = ofsted === "NULL" ? "Not judged" : ofsted ?? "Not judged";
  switch (g) {
    case "Outstanding": return "outstanding";
    case "Good": return "good";
    case "Requires Improvement": return "requires";
    case "Inadequate": return "inadequate";
    default: return "none";
  }
}

/** HSL string for map fill colours (no hsl() wrapper for MapLibre expression compatibility). */
export function ofstedHsl(ofsted: School["ofsted"]): string {
  const g = ofsted === "NULL" ? "Not judged" : ofsted ?? "Not judged";
  switch (g) {
    case "Outstanding": return "hsl(152, 56%, 34%)";
    case "Good": return "hsl(212, 80%, 42%)";
    case "Requires Improvement": return "hsl(38, 92%, 42%)";
    case "Inadequate": return "hsl(0, 72%, 45%)";
    default: return "hsl(220, 8%, 55%)";
  }
}

export function ofstedLabel(ofsted: School["ofsted"]): string {
  if (ofsted === "NULL" || ofsted === null) return "Not judged";
  return ofsted;
}

/** Postcode district: "BS2 0SU" → "bs2" */
export function postcodeDistrict(postcode: string): string {
  const out = postcode.trim().split(/\s+/)[0] ?? "";
  return out.toLowerCase();
}

/** Postcode district display: "bs2" → "BS2" */
export function districtLabel(district: string): string {
  return district.toUpperCase();
}

/** Format Ofsted date dd/mm/yyyy → "25 Sep 2013" */
export function formatOfstedDate(date: string | null): string {
  if (!date) return "—";
  const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return date;
  const [, d, mo, y] = m;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(mo) - 1]} ${y}`;
}