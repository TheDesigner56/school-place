import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin, Users, Calendar, Building2, Layers, GraduationCap, School as SchoolIcon, BookOpen } from "lucide-react";
import { getSchools, getSchoolBySlug, getSchoolsInDistrict, getMeta, getCrime, getPerformance, getPrices, getAdmissions } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfstedBadge } from "@/components/ofsted-badge";
import { ProvenanceChip, ProvenanceLine } from "@/components/provenance";
import { SchoolMiniMap } from "@/components/school-mini-map";
import { formatOfstedDate, ofstedLabel, districtLabel, postcodeDistrict } from "@/lib/utils";

export async function generateStaticParams() {
  const schools = await getSchools();
  return schools.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const school = await getSchoolBySlug(params.slug);
  if (!school) return { title: "School not found" };
  return {
    title: `${school.name}`,
    description: `${school.name}, ${school.la} — Ofsted: ${ofstedLabel(school.ofsted)}, ${school.phase}, ${school.pupils ?? "?"} pupils. Honest UK school intelligence from School Place.`,
  };
}

export default async function SchoolPage({ params }: { params: { slug: string } }) {
  const [school, meta, crime, perf, prices, admissions] = await Promise.all([getSchoolBySlug(params.slug), getMeta(), getCrime(), getPerformance(), getPrices(), getAdmissions()]);
  if (!school) notFound();

  const district = postcodeDistrict(school.postcode);
  const nearby = (await getSchoolsInDistrict(district))
    .filter((s) => s.urn !== school.urn)
    .slice(0, 6);

  // Neighbourhood crime: this school's LSOA, May 2026 snapshot
  const lsoaCrime = school.lsoa ? crime[school.lsoa] : undefined;
  const topCategories = lsoaCrime
    ? Object.entries(lsoaCrime.by_category).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const fmtCategory = (c: string) => c.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

  // Exam performance (KS2 for primary, GCSE for secondary)
  const schoolPerf = perf[String(school.urn)];

  // Local sold prices (postcode district)
  const districtPrices = prices[district.toUpperCase()];

  // Admissions: last-distance-offered history (the honest-probability engine seed)
  const schoolAdm = admissions[String(school.urn)];
  const admYears = schoolAdm?.years?.slice().sort((a, b) => b.year - a.year) ?? [];
  const distValues = admYears.map((y) => y.last_distance_m).filter((d): d is number => d != null);
  const distMin = distValues.length ? Math.min(...distValues) : null;
  const distMax = distValues.length ? Math.max(...distValues) : null;
  const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

  // schema.org School markup
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: school.name,
    identifier: school.urn,
    address: {
      "@type": "PostalAddress",
      postalCode: school.postcode,
      addressRegion: school.la,
    },
    geo: { "@type": "GeoCoordinates", latitude: school.lat, longitude: school.lng },
    department: school.la,
    numberOfStudents: school.pupils ?? undefined,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container max-w-4xl py-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to map
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {school.phase}
            </span>
            <OfstedBadge ofsted={school.ofsted} showDate date={school.ofsted_date ? formatOfstedDate(school.ofsted_date) : null} />
          </div>
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {school.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{school.postcode}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{school.pupils != null ? <><span className="tabular-nums">{school.pupils}</span> pupils</> : "Pupils unknown"}</span>
            <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{school.la}</span>
          </div>
        </div>

        {/* Grid: Ofsted + identity */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Ofsted section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ofsted outcome</CardTitle>
              <CardDescription>Latest inspection grade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <OfstedBadge ofsted={school.ofsted} className="text-sm" />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Grade</dt>
                  <dd className="mt-0.5 tabular-nums">{school.ofsted_grade ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Inspection date</dt>
                  <dd className="mt-0.5 tabular-nums">{formatOfstedDate(school.ofsted_date)}</dd>
                </div>
              </dl>
              {school.ofsted && school.ofsted !== "Not judged" && school.ofsted !== "NULL" && (
                <a
                  href={`https://reports.ofsted.gov.uk/urn/${school.urn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                >
                  <BookOpen className="h-3 w-3" /> Full report on Ofsted.gov.uk ↗
                </a>
              )}
              <ProvenanceLine>
                <ProvenanceChip>{meta.data_as_of}</ProvenanceChip>
              </ProvenanceLine>
            </CardContent>
          </Card>

          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
              <CardDescription>Type, governance &amp; admissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3 w-3" />Type</dt>
                  <dd className="mt-0.5">{school.type ?? "—"}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers className="h-3 w-3" />Local authority</dt>
                  <dd className="mt-0.5">{school.la}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><SchoolIcon className="h-3 w-3" />MAT / trust</dt>
                  <dd className="mt-0.5">{school.mat ?? "No MAT"}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><GraduationCap className="h-3 w-3" />Admissions</dt>
                  <dd className="mt-0.5">{school.admissions_policy ?? "Unknown"}</dd>
                </div>
              </dl>
              <ProvenanceLine><ProvenanceChip>School establishment data (GIAS)</ProvenanceChip></ProvenanceLine>
            </CardContent>
          </Card>
        </div>

        {/* Exam results */}
        {schoolPerf && (schoolPerf.ks2 || schoolPerf.gcse) && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Exam results</CardTitle>
              <CardDescription>
                {schoolPerf.ks2 ? `Key Stage 2 · ${schoolPerf.ks2.year}` : schoolPerf.gcse ? `GCSE · ${schoolPerf.gcse.year}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {schoolPerf.ks2 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Expected standard (RWM)</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.ks2.expected_pct != null ? `${schoolPerf.ks2.expected_pct}%` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Higher standard</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.ks2.higher_pct != null ? `${schoolPerf.ks2.higher_pct}%` : "—"}</dd>
                  </div>
                  {schoolPerf.ks2.reading_avg != null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Avg scaled score (reading)</dt>
                      <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.ks2.reading_avg}</dd>
                    </div>
                  )}
                </dl>
              )}
              {schoolPerf.gcse && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Attainment 8</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.gcse.attainment8 ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Progress 8</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.gcse.progress8 != null ? schoolPerf.gcse.progress8.toFixed(2) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">EBacc APS</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.gcse.ebacc_aps ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Grade 5+ Eng &amp; Maths</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{schoolPerf.gcse.eng_maths_5plus_pct != null ? `${schoolPerf.gcse.eng_maths_5plus_pct}%` : "—"}</dd>
                  </div>
                </dl>
              )}
              <ProvenanceLine>
                <ProvenanceChip>{schoolPerf.source_label}</ProvenanceChip>
              </ProvenanceLine>
            </CardContent>
          </Card>
        )}

        {/* Admissions: honest last-distance history */}
        {admYears.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Getting in</CardTitle>
              <CardDescription>Published allocation history — how far the last offer reached</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {distMin != null && distMax != null && (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl font-semibold tabular-nums">{fmtDist(distMin)} – {fmtDist(distMax)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Range of last-distance-offered across {distValues.length} published year{distValues.length > 1 ? "s" : ""}. This is a volatility band, not a boundary — past years do not guarantee future offers.
                  </p>
                </div>
              )}
              <dl className="space-y-1.5 text-sm">
                {admYears.map((y) => (
                  <div key={y.year} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground tabular-nums">{y.year}</dt>
                    <dd className="tabular-nums font-medium">
                      {y.last_distance_m != null ? fmtDist(y.last_distance_m) : (y.criterion_met === "all applicants" ? "All applicants offered" : "—")}
                      {y.criterion_met && y.last_distance_m != null && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({y.criterion_met})</span>}
                    </dd>
                    {y.pan != null && <dd className="text-xs text-muted-foreground tabular-nums">PAN {y.pan}</dd>}
                  </div>
                ))}
              </dl>
              <ProvenanceLine>
                <ProvenanceChip>{schoolAdm?.source_label} · {schoolAdm?.la}</ProvenanceChip>
              </ProvenanceLine>
            </CardContent>
          </Card>
        )}

        {/* Location map */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>{school.postcode} · {districtLabel(district)} district</CardDescription>
          </CardHeader>
          <CardContent>
            <SchoolMiniMap school={school} />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Ward</dt><dd className="mt-0.5">{school.ward ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">District</dt><dd className="mt-0.5">{school.district ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Postcode area</dt><dd className="mt-0.5">{school.postcode}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Coordinates</dt><dd className="mt-0.5 tabular-nums">{school.lat != null ? school.lat.toFixed(4) : "—"}, {school.lng != null ? school.lng.toFixed(4) : "—"}</dd></div>
            </div>
            <ProvenanceLine><ProvenanceChip>Geocoded via postcodes.io · OS OGL</ProvenanceChip></ProvenanceLine>
          </CardContent>
        </Card>

        {/* Neighbourhood safety */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Neighbourhood safety</CardTitle>
            <CardDescription>
              Recorded crime in {school.lsoa ?? "this area"} · May 2026
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lsoaCrime ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-semibold tabular-nums">{lsoaCrime.total}</span>
                  <span className="text-sm text-muted-foreground">crimes recorded in one month</span>
                </div>
                <dl className="space-y-1.5 text-sm">
                  {topCategories.map(([cat, n]) => (
                    <div key={cat} className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{fmtCategory(cat)}</dt>
                      <dd className="tabular-nums font-medium">{n}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recorded-crime data available for this neighbourhood.</p>
            )}
            <ProvenanceLine>
              <ProvenanceChip>Police.uk street-level crime · LSOA · May 2026</ProvenanceChip>
            </ProvenanceLine>
          </CardContent>
        </Card>

        {/* Local market */}
        {districtPrices && districtPrices.median != null && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Local market</CardTitle>
              <CardDescription>
                Sold prices in {districtLabel(district)} · {districtPrices.transactions} sales · {districtPrices.period}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-semibold tabular-nums">£{districtPrices.median.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">median sold price</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Lower quartile</dt>
                  <dd className="tabular-nums font-medium">{districtPrices.p25 != null ? `£${districtPrices.p25.toLocaleString()}` : "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Upper quartile</dt>
                  <dd className="tabular-nums font-medium">{districtPrices.p75 != null ? `£${districtPrices.p75.toLocaleString()}` : "—"}</dd>
                </div>
              </dl>
              <ProvenanceLine>
                <ProvenanceChip>HM Land Registry Price Paid · {districtLabel(district)}</ProvenanceChip>
              </ProvenanceLine>
            </CardContent>
          </Card>
        )}

        {/* Neighbourhood placeholder */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Neighbourhood</CardTitle>
            <CardDescription>Other schools in the {districtLabel(district)} postcode district</CardDescription>
          </CardHeader>
          <CardContent>
            {nearby.length > 0 ? (
              <ul className="divide-y divide-border">
                {nearby.map((s) => (
                  <li key={s.urn}>
                    <Link href={`/school/${s.slug}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-accent/50 -mx-2 px-2 rounded">
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.phase}</span>
                      <OfstedBadge ofsted={s.ofsted} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No other schools found in this postcode district.</p>
            )}
            <Link href={`/area/${district}`} className="mt-4 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
              View all {districtLabel(district)} schools →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}