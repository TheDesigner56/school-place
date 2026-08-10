import Link from "next/link";
import type { Metadata } from "next";
import { Trophy, TrendingUp, ArrowUpDown } from "lucide-react";
import { getSchools, getPerformance } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfstedBadge } from "@/components/ofsted-badge";
import { ProvenanceChip, ProvenanceLine } from "@/components/provenance";
import { districtLabel } from "@/lib/utils";
import type { School } from "@/lib/utils";

export const metadata: Metadata = {
  title: "School league tables — England",
  description:
    "Honest school league tables for England: primary schools ranked by Key Stage 2 results, secondary by GCSE Attainment 8 and Progress 8. Real DfE data, free.",
};

type Row = {
  urn: number; slug: string; name: string; phase: string; district: string;
  ofsted: School["ofsted"]; metric: number | null; metric2: number | null; pupils: number | null;
};

export default async function LeagueTablesPage() {
  const [schools, perf] = await Promise.all([getSchools(), getPerformance()]);

  const primary: Row[] = [];
  const secondary: Row[] = [];
  for (const s of schools) {
    const p = perf[String(s.urn)];
    if (!p) continue;
    if (p.ks2 && p.ks2.expected_pct != null) {
      primary.push({ urn: s.urn, slug: s.slug, name: s.name, phase: s.phase, district: s.postcode.split(" ")[0], ofsted: s.ofsted, metric: p.ks2.expected_pct, metric2: p.ks2.higher_pct ?? null, pupils: s.pupils });
    }
    if (p.gcse && p.gcse.attainment8 != null) {
      secondary.push({ urn: s.urn, slug: s.slug, name: s.name, phase: s.phase, district: s.postcode.split(" ")[0], ofsted: s.ofsted, metric: p.gcse.attainment8, metric2: p.gcse.progress8 ?? null, pupils: s.pupils });
    }
  }
  primary.sort((a, b) => (b.metric ?? 0) - (a.metric ?? 0));
  secondary.sort((a, b) => (b.metric ?? 0) - (a.metric ?? 0));

  const primaryYear = perf[String(primary[0]?.urn)]?.ks2?.year ?? 2024;
  const secondaryYear = perf[String(secondary[0]?.urn)]?.gcse?.year ?? 2024;

  return (
    <div className="container max-w-5xl py-6 sm:py-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <p className="eyebrow flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-primary" /> League tables · England
      </p>
      <h1 className="mt-2.5 font-serif text-[2.4rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl">
        School league tables
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        England, ranked on published results. Exam data is one lens — it measures
        attainment, not teaching quality, and reflects intake as much as instruction. Read it alongside everything else.
      </p>

      {/* ── Primary ────────────────────────────────────────── */}
      <Card className="mt-8 animate-rise">
        <CardHeader>
          <CardTitle>Primary schools</CardTitle>
          <CardDescription>
            Ranked by % meeting the expected standard in reading, writing &amp; maths · Key Stage 2 · {primaryYear} · {primary.length} schools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2.5 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">#</th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">School</th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Area</th>
                  <th className="py-2.5 pr-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Expected std</th>
                  <th className="py-2.5 pr-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Higher std</th>
                  <th className="py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Ofsted</th>
                </tr>
              </thead>
              <tbody>
                {primary.map((r, i) => (
                  <tr key={r.urn} className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/50">
                    <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/school/${r.slug}`} className="font-medium underline-offset-4 hover:underline">{r.name}</Link>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      <Link href={`/area/${r.district.toLowerCase()}`} className="underline-offset-4 hover:underline">{districtLabel(r.district)}</Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">{r.metric}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">{r.metric2 != null ? `${r.metric2}%` : "—"}</td>
                    <td className="py-2.5 text-right"><OfstedBadge ofsted={r.ofsted} className="px-1.5 py-0 text-[10px]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ProvenanceLine><ProvenanceChip>DfE KS2 attainment {primaryYear - 1}/{String(primaryYear).slice(2)} (revised)</ProvenanceChip></ProvenanceLine>
        </CardContent>
      </Card>

      {/* ── Secondary ──────────────────────────────────────── */}
      <Card className="mt-6 animate-rise" style={{ animationDelay: "60ms" }}>
        <CardHeader>
          <CardTitle>Secondary schools</CardTitle>
          <CardDescription>
            Ranked by Attainment 8 (average GCSE score) · also showing Progress 8 (pupil progress vs similar starting points) · {secondaryYear} · {secondary.length} schools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2.5 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">#</th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">School</th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Area</th>
                  <th className="py-2.5 pr-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Attainment 8</th>
                  <th className="py-2.5 pr-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Progress 8</th>
                  <th className="py-2.5 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Ofsted</th>
                </tr>
              </thead>
              <tbody>
                {secondary.map((r, i) => (
                  <tr key={r.urn} className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/50">
                    <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/school/${r.slug}`} className="font-medium underline-offset-4 hover:underline">{r.name}</Link>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      <Link href={`/area/${r.district.toLowerCase()}`} className="underline-offset-4 hover:underline">{districtLabel(r.district)}</Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">{r.metric}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                      {r.metric2 != null ? (
                        <span className={r.metric2 > 0 ? "text-emerald-600 dark:text-emerald-400" : r.metric2 < 0 ? "text-rose-600 dark:text-rose-400" : ""}>
                          {r.metric2 > 0 ? "+" : ""}{r.metric2.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 text-right"><OfstedBadge ofsted={r.ofsted} className="px-1.5 py-0 text-[10px]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ProvenanceLine><ProvenanceChip>DfE KS4 performance tables {secondaryYear - 1}/{String(secondaryYear).slice(2)} (revised)</ProvenanceChip></ProvenanceLine>
        </CardContent>
      </Card>

      {/* ── How to read these ──────────────────────────────── */}
      <p className="mt-6 flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-[13px] leading-relaxed text-muted-foreground animate-rise" style={{ animationDelay: "120ms" }}>
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong className="font-semibold text-foreground">How to read these.</strong> Attainment 8 measures raw results; Progress 8
          measures how far pupils travelled from their starting points — a positive score means pupils make more progress
          than similar pupils nationally. A school with modest results but strong progress may be doing better by its
          pupils than one coasting on an advantaged intake.
        </span>
      </p>
    </div>
  );
}
