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
  derived_ofsted: "Outstanding" | "Good" | "Requires Improvement" | "Inadequate" | null;
  derived_ofsted_source: "official" | "categories" | "report_card" | null;
};

export type OfstedGrade = NonNullable<School["ofsted"] | School["derived_ofsted"]>;
export type DerivedOfstedSource = NonNullable<School["derived_ofsted_source"]>;

export const OFSTED_ORDER: OfstedGrade[] = [
  "Outstanding",
  "Good",
  "Requires Improvement",
  "Inadequate",
  "Not judged",
];

export const PHASES = ["Nursery", "Primary", "Secondary", "Special", "PRU"] as const;

/** Effective grade used for colours, badges and search dots: derived first, official fallback. */
export function effectiveOfsted(school: School): School["ofsted"] {
  return school.derived_ofsted ?? school.ofsted;
}

export function isDerived(ofstedSource: School["derived_ofsted_source"]): boolean {
  return ofstedSource != null && ofstedSource !== "official";
}

export function derivedTooltip(source: NonNullable<School["derived_ofsted_source"]>): string {
  switch (source) {
    case "categories":
      return "Derived from inspection categories (Ofsted no longer issues a headline grade)";
    case "report_card":
      return "Derived from 2026 report-card judgements (Ofsted no longer issues a headline grade)";
    default:
      return "Official Ofsted grade";
  }
}

/** Map Ofsted value → CSS var token name. "NULL" treated as Not judged. */
export function ofstedToken(ofsted: School["ofsted"] | School["derived_ofsted"]): string {
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
export function ofstedHsl(ofsted: School["ofsted"] | School["derived_ofsted"]): string {
  const g = ofsted === "NULL" ? "Not judged" : ofsted ?? "Not judged";
  switch (g) {
    case "Outstanding": return "hsl(152, 56%, 34%)";
    case "Good": return "hsl(212, 80%, 42%)";
    case "Requires Improvement": return "hsl(38, 92%, 42%)";
    case "Inadequate": return "hsl(0, 72%, 45%)";
    default: return "hsl(220, 8%, 55%)";
  }
}

export function ofstedLabel(ofsted: School["ofsted"] | School["derived_ofsted"]): string {
  if (ofsted === "NULL" || ofsted === null) return "Not judged";
  return ofsted;
}

/** 2026 report-card sub-judgement colours by their own grade names. */
export function reportCardGradeColor(grade: string): string {
  switch (grade.trim()) {
    case "Exceptional": return "hsl(217, 91%, 45%)";      // blue
    case "Strong standard": return "hsl(160, 60%, 28%)";  // dark green
    case "Expected standard": return "hsl(145, 55%, 40%)"; // green
    case "Needs attention": return "hsl(38, 92%, 42%)";   // amber
    case "Urgent improvement": return "hsl(0, 72%, 45%)"; // red
    default: return "hsl(220, 8%, 55%)";
  }
}

export function reportCardGradeToken(grade: string): string {
  switch (grade.trim()) {
    case "Exceptional": return "exceptional";
    case "Strong standard": return "strong";
    case "Expected standard": return "expected";
    case "Needs attention": return "needs-attention";
    case "Urgent improvement": return "urgent";
    default: return "none";
  }
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
