import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin } from "lucide-react";
import { getDistricts, getSchoolData, getMeta, getPrices } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfstedBadge } from "@/components/ofsted-badge";
import { ProvenanceChip, ProvenanceLine } from "@/components/provenance";
import { OFSTED_ORDER, districtLabel, ofstedLabel } from "@/lib/utils";
import type { School } from "@/lib/utils";

export async function generateStaticParams() {
  const districts = await getDistricts();
  return Object.keys(districts).map((d) => ({ district: d }));
}

export async function generateMetadata({ params }: { params: { district: string } }): Promise<Metadata> {
  const label = districtLabel(params.district);
  return {
    title: `Schools in ${label}`,
    description: `All schools in the ${label} postcode district — Ofsted grades, type, and pupils. Honest UK school intelligence from School Place.`,
  };
}

export default async function AreaPage({ params }: { params: { district: string } }) {
  const [districts, meta, prices] = await Promise.all([
    getDistricts(),
    getMeta(),
    getPrices(),
  ]);
  const slugs = districts[params.district.toLowerCase()] ?? [];
  const schools = (await Promise.all(slugs.map((slug) => getSchoolData(slug))))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => d.school);
  if (schools.length === 0) notFound();

  const label = districtLabel(params.district);
  const districtPrices = prices[params.district.toUpperCase()];

  // Summary stats
  const byGrade: Record<string, number> = {};
  for (const s of schools) {
    const g = ofstedLabel(s.ofsted);
    byGrade[g] = (byGrade[g] ?? 0) + 1;
  }
  const totalPupils = schools.reduce((acc, s) => acc + (s.pupils ?? 0), 0);
  const phases = Array.from(new Set(schools.map((s) => s.phase))).sort();

  return (
    <div className="container max-w-4xl py-6 sm:py-10">
      <Link href="/" className="press mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-card hover:bg-accent hover:text-foreground sm:mb-8">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to map
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <section className="border-b border-border/60 pb-8">
        <p className="eyebrow flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" /> Postcode district
        </p>
        <h1 className="mt-2.5 font-serif text-[2.4rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl">
          {label}
        </h1>
        <p className="mt-3 text-sm tabular-nums text-muted-foreground">
          {schools.length} schools · {totalPupils.toLocaleString()} pupils total · {phases.join(", ")}
        </p>
      </section>

      {/* ── Ofsted grade mix ───────────────────────────────── */}
      <section className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {OFSTED_ORDER.map((g, i) => (
          <div
            key={g}
            className="hover-lift rounded-2xl border border-border/70 bg-card p-4 shadow-card animate-rise"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-1.5">
              <OfstedBadge ofsted={g} className="px-1.5 py-0 text-[10px]" />
            </div>
            <p className="mt-2 font-serif text-[1.9rem] font-semibold leading-none tabular-nums tracking-tight">{byGrade[g] ?? 0}</p>
          </div>
        ))}
      </section>

      {/* ── School list ────────────────────────────────────── */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Schools in {label}</CardTitle>
          <CardDescription>Sorted by Ofsted grade then name</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/50">
            {[...schools]
              .sort((a, b) => {
                const ai = OFSTED_ORDER.indexOf(ofstedLabel(a.ofsted) as never);
                const bi = OFSTED_ORDER.indexOf(ofstedLabel(b.ofsted) as never);
                if (ai !== bi) return ai - bi;
                return a.name.localeCompare(b.name);
              })
              .map((s: School) => (
                <li key={s.urn}>
                  <Link href={`/school/${s.slug}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.phase} · {s.type} · {s.pupils != null ? <span className="tabular-nums">{s.pupils}</span> : "?"} pupils · {s.postcode}
                      </p>
                    </div>
                    <OfstedBadge ofsted={s.ofsted} className="shrink-0" />
                  </Link>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Sold house prices ──────────────────────────────── */}
      {districtPrices && districtPrices.median != null && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sold house prices</CardTitle>
            <CardDescription>
              {districtPrices.transactions} transactions · {districtPrices.period}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Median</dt>
                <dd className="mt-1 font-serif text-xl font-semibold tabular-nums tracking-tight">£{districtPrices.median.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Lower quartile</dt>
                <dd className="mt-1 font-serif text-xl font-semibold tabular-nums tracking-tight">{districtPrices.p25 != null ? `£${districtPrices.p25.toLocaleString()}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Upper quartile</dt>
                <dd className="mt-1 font-serif text-xl font-semibold tabular-nums tracking-tight">{districtPrices.p75 != null ? `£${districtPrices.p75.toLocaleString()}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sales</dt>
                <dd className="mt-1 font-serif text-xl font-semibold tabular-nums tracking-tight">{districtPrices.transactions}</dd>
              </div>
            </dl>
            <ProvenanceLine>
              <ProvenanceChip>HM Land Registry Price Paid · SPARQL</ProvenanceChip>
            </ProvenanceLine>
          </CardContent>
        </Card>
      )}

      {/* ── Nearby districts ───────────────────────────────── */}
      <section className="mt-8">
        <p className="eyebrow mb-3">Nearby districts</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(districts)
            .filter((d) => d !== params.district)
            .slice(0, 12)
            .map((d) => (
              <Link
                key={d}
                href={`/area/${d}`}
                className="press rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card hover:bg-accent hover:text-foreground"
              >
                {districtLabel(d)}
              </Link>
            ))}
        </div>
      </section>

      <div className="mt-6">
        <ProvenanceChip>{meta.data_as_of}</ProvenanceChip>
      </div>
    </div>
  );
}
