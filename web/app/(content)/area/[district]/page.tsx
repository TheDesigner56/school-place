import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin } from "lucide-react";
import { getDistricts, getSchoolData, getMeta, getPrices } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfstedBadge } from "@/components/ofsted-badge";
import { ProvenanceChip } from "@/components/provenance";
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
    <div className="container max-w-4xl py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to map
      </Link>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" /> Postcode district
      </div>
      <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight">{label}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {schools.length} schools · {totalPupils.toLocaleString()} pupils total · {phases.join(", ")}
      </p>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {OFSTED_ORDER.map((g) => (
          <Card key={g}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5">
                <OfstedBadge ofsted={g} className="px-1.5 py-0 text-[10px]" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{byGrade[g] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* School list */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Schools in {label}</CardTitle>
          <CardDescription>Sorted by Ofsted grade then name</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {[...schools]
              .sort((a, b) => {
                const ai = OFSTED_ORDER.indexOf(ofstedLabel(a.ofsted) as never);
                const bi = OFSTED_ORDER.indexOf(ofstedLabel(b.ofsted) as never);
                if (ai !== bi) return ai - bi;
                return a.name.localeCompare(b.name);
              })
              .map((s: School) => (
                <li key={s.urn}>
                  <Link href={`/school/${s.slug}`} className="flex items-center justify-between gap-3 py-3 -mx-2 px-2 rounded hover:bg-accent/50">
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

      {/* Sold prices */}
      {districtPrices && districtPrices.median != null && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Sold house prices</CardTitle>
            <CardDescription>
              {districtPrices.transactions} transactions · {districtPrices.period}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Median</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">£{districtPrices.median.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Lower quartile</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{districtPrices.p25 != null ? `£${districtPrices.p25.toLocaleString()}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Upper quartile</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{districtPrices.p75 != null ? `£${districtPrices.p75.toLocaleString()}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sales</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{districtPrices.transactions}</dd>
              </div>
            </dl>
            <ProvenanceChip>HM Land Registry Price Paid · SPARQL</ProvenanceChip>
          </CardContent>
        </Card>
      )}

      {/* Adjacent districts */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Nearby districts</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(districts)
            .filter((d) => d !== params.district)
            .slice(0, 12)
            .map((d) => (
              <Link
                key={d}
                href={`/area/${d}`}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {districtLabel(d)}
              </Link>
            ))}
        </div>
      </div>

      <div className="mt-6">
        <ProvenanceChip>{meta.data_as_of}</ProvenanceChip>
      </div>
    </div>
  );
}