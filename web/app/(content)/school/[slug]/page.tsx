import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  MapPin,
  Users,
  Building2,
  Layers,
  GraduationCap,
  School as SchoolIcon,
  BookOpen,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { getSchools, getSchoolData, getDistricts } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfstedBadge } from "@/components/ofsted-badge";
import { ProvenanceChip, ProvenanceLine } from "@/components/provenance";
import { SchoolMiniMap } from "@/components/school-mini-map";
import {
  effectiveOfsted,
  formatOfstedDate,
  isDerived,
  derivedTooltip,
  ofstedHsl,
  ofstedLabel,
  reportCardGradeColor,
  districtLabel,
  postcodeDistrict,
  type School,
} from "@/lib/utils";

export async function generateStaticParams() {
  const schools = await getSchools();
  return schools.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getSchoolData(params.slug);
  const school = data?.school;
  if (!school) return { title: "School not found" };
  const grade = effectiveOfsted(school);
  return {
    title: `${school.name}`,
    description: `${school.name}, ${school.la} — Ofsted: ${ofstedLabel(grade)}, ${school.phase}, ${school.pupils ?? "?"} pupils. Honest UK school intelligence from School Place.`,
  };
}

export default async function SchoolPage({ params }: { params: { slug: string } }) {
  const [data, districts] = await Promise.all([getSchoolData(params.slug), getDistricts()]);
  if (!data) notFound();
  const { school, ofsted, perf, perf_history: trend, chars, admissions: schoolAdm, crime, prices, flood, data_as_of } = data;

  const district = postcodeDistrict(school.postcode);
  const nearby = (await Promise.all(
    (districts[district] ?? [])
      .filter((slug) => slug !== school.slug)
      .slice(0, 6)
      .map((slug) => getSchoolData(slug))
  )).filter((d): d is NonNullable<typeof d> => Boolean(d)).map((d) => d.school);

  const lsoaCrime = crime;
  const topCategories = lsoaCrime
    ? Object.entries(lsoaCrime.by_category).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const fmtCategory = (c: string) => c.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

  const schoolPerf = perf;

  const districtPrices = prices;

  const admYears = schoolAdm?.years?.slice().sort((a, b) => b.year - a.year) ?? [];
  const distValues = admYears.map((y) => y.last_distance_m).filter((d): d is number => d != null);
  const distMin = distValues.length ? Math.min(...distValues) : null;
  const distMax = distValues.length ? Math.max(...distValues) : null;
  const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

  const trendYears = trend?.ks2?.years ?? trend?.gcse?.years ?? [];

  const effectiveGrade = effectiveOfsted(school);
  const derived = isDerived(school.derived_ofsted_source);

  // Top 4 Flighty-style stats (best available, never invented).
  const stats: { label: string; value: string; provenance?: string }[] = [];
  if (schoolPerf?.gcse?.attainment8 != null) {
    stats.push({ label: "Attainment 8", value: schoolPerf.gcse.attainment8.toString(), provenance: schoolPerf.source_label });
  }
  if (schoolPerf?.ks2?.expected_pct != null) {
    stats.push({ label: "KS2 expected standard", value: `${schoolPerf.ks2.expected_pct}%`, provenance: schoolPerf.source_label });
  }
  if (chars?.fsm_pct != null) {
    stats.push({ label: "Free school meals", value: `${chars.fsm_pct}%`, provenance: chars.source_label });
  }
  if (school.pupils != null) {
    stats.push({ label: "Pupils", value: school.pupils.toLocaleString(), provenance: "GIAS" });
  }
  if (stats.length < 4 && schoolPerf?.gcse?.progress8 != null) {
    stats.push({ label: "Progress 8", value: schoolPerf.gcse.progress8.toFixed(2), provenance: schoolPerf.source_label });
  }
  if (stats.length < 4 && chars?.eal_pct != null) {
    stats.push({ label: "English as addl. language", value: `${chars.eal_pct}%`, provenance: chars.source_label });
  }
  if (stats.length < 4 && chars?.class_size_avg != null) {
    stats.push({ label: "Avg class size", value: chars.class_size_avg.toString(), provenance: chars.source_label });
  }

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
      <div className="container max-w-4xl py-6 sm:py-10">
        <Link href="/" className="press mb-5 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground sm:mb-7">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to map
        </Link>

        {/* Hero */}
        <section className="space-y-4 border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-2">
            <OfstedBadge
              ofsted={effectiveGrade}
              derivedSource={school.derived_ofsted_source}
              className="px-3 py-1 text-sm"
            />
            <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {school.phase}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {school.postcode}
            </span>
          </div>

          <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {school.name}
          </h1>

          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <SummaryChip icon={Users} value={school.pupils != null ? `${school.pupils.toLocaleString()} pupils` : "Pupils unknown"} />
            <SummaryChip icon={GraduationCap} value={school.la} />
            <SummaryChip icon={Building2} value={school.mat ?? "No MAT"} />
            <SummaryChip icon={SchoolIcon} value={school.admissions_policy ?? "Admissions unknown"} />
          </div>

          {derived && (
            <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{derivedTooltip(school.derived_ofsted_source as NonNullable<School["derived_ofsted_source"]>)}</span>
            </p>
          )}
        </section>

        {/* Flighty stat strip — big tabular numerals, provenance on every figure */}
        {stats.length > 0 && (
          <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.slice(0, 4).map((s, i) => (
              <div
                key={s.label}
                className="hover-lift rounded-2xl border border-border bg-card p-4 shadow-sm animate-rise"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1.5 font-serif text-3xl font-semibold tabular-nums tracking-tight">{s.value}</p>
                {s.provenance && <ProvenanceChip className="mt-2.5">{s.provenance}</ProvenanceChip>}
              </div>
            ))}
          </section>
        )}

        {/* Hero mini-map */}
        <section className="mt-7">
          <SchoolMiniMap school={school} />
        </section>

        {/* Ofsted timeline */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Ofsted</CardTitle>
            <CardDescription>Inspection history &amp; judgements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {derived && ofsted?.latest && (
              <div className="rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm">
                <span className="text-muted-foreground">Official Ofsted label:</span>{" "}
                <span className="font-medium">{ofstedLabel(school.ofsted)}</span>
                {ofsted.latest.date && (
                  <span className="text-muted-foreground"> · inspected {formatOfstedDate(ofsted.latest.date)}</span>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-4">
              {ofsted?.latest?.date && (
                <TimelineItem
                  date={formatOfstedDate(ofsted.latest.date)}
                  type={ofsted.latest.type ?? "Inspection"}
                  badge={ofsted.latest.overall}
                >
                  {ofsted.latest.sub && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
                      {Object.entries(ofsted.latest.sub).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                          <dd className="font-medium" style={{ color: v ? ofstedHsl(v as never) : undefined }}>{v ?? "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </TimelineItem>
              )}
              {ofsted?.previous?.date && (
                <TimelineItem
                  date={formatOfstedDate(ofsted.previous.date)}
                  type="Previous inspection"
                  badge={ofsted.previous.overall}
                />
              )}
            </div>

            {/* 2026 report card */}
            {ofsted?.report_card_2026?.sub_judgements && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  2026 report card · inspected {formatOfstedDate(ofsted.report_card_2026.inspection_date)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ofsted.report_card_2026.sub_judgements).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: reportCardGradeColor(v) }}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span>
                      <span>{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!ofsted && <CompactEmpty>No Ofsted inspection data available for this school yet.</CompactEmpty>}

            {ofsted?.report_url && (
              <a href={ofsted.report_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
                <BookOpen className="h-3 w-3" /> Full report on Ofsted.gov.uk ↗
              </a>
            )}
            <ProvenanceLine>
              <ProvenanceChip>{ofsted?.source_label ?? data_as_of ?? "Ofsted"}</ProvenanceChip>
            </ProvenanceLine>
          </CardContent>
        </Card>

        {/* Identity */}
        <Card className="mt-5">
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

        {/* Exam results */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Exam results</CardTitle>
            <CardDescription>
              {schoolPerf?.ks2 ? `Key Stage 2 · ${schoolPerf.ks2.year}` : schoolPerf?.gcse ? `GCSE · ${schoolPerf.gcse.year}` : "Published performance data"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schoolPerf && (schoolPerf.ks2 || schoolPerf.gcse) ? (
              <>
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
                {trendYears.length > 1 && (
                  <div className="rounded-md border border-border bg-muted/40 p-2.5">
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <TrendingUp className="h-3 w-3" /> Trend
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
                      {trendYears.map((y) => (
                        <span key={y.year}>
                          <span className="text-muted-foreground">{y.year}:</span>{" "}
                          <span className="font-semibold">
                            {y.expected_pct != null ? `${y.expected_pct}%` : y.attainment8 != null ? y.attainment8 : "—"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <ProvenanceLine>
                  <ProvenanceChip>{schoolPerf.source_label}</ProvenanceChip>
                </ProvenanceLine>
              </>
            ) : (
              <CompactEmpty>No published exam results for this school yet.</CompactEmpty>
            )}
          </CardContent>
        </Card>

        {/* Admissions */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Getting in</CardTitle>
            <CardDescription>Published allocation history — how far the last offer reached</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {admYears.length > 0 ? (
              <>
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
              </>
            ) : (
              <CompactEmpty>No published admissions distance data for this school yet.</CompactEmpty>
            )}
          </CardContent>
        </Card>

        {/* Pupil profile */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Pupil profile</CardTitle>
            <CardDescription>Who attends · {chars?.source_label ?? "School census"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chars && (chars.fsm_pct != null || chars.ethnicity) ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Free school meals</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{chars.fsm_pct != null ? `${chars.fsm_pct}%` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">English as addl. language</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{chars.eal_pct != null ? `${chars.eal_pct}%` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Avg class size</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{chars.class_size_avg ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">On roll</dt>
                    <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{chars.pupils_on_roll ?? "—"}</dd>
                  </div>
                </dl>
                {chars.ethnicity && (() => {
                  const palette = ["bg-indigo-500", "bg-sky-400", "bg-emerald-500", "bg-amber-400", "bg-rose-400"];
                  const top = Object.entries(chars.ethnicity)
                    .filter(([k, v]) => v > 0 && k !== "unclassified")
                    .sort((a, b) => b[1] - a[1]).slice(0, 5);
                  const total = Object.values(chars.ethnicity).reduce((a, b) => a + b, 0);
                  return top.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-xs text-muted-foreground">Ethnicity (largest groups)</p>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                        {top.map(([k, v], i) => (
                          <div key={k} style={{ width: `${(v / Math.max(total, 1)) * 100}%` }}
                               className={`h-full ${palette[i]}`}
                               title={`${k.replace(/_/g, " ")}: ${v}%`} />
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {top.map(([k, v]) => (
                          <span key={k}>{k.replace(/_/g, " ")} <span className="tabular-nums font-medium text-foreground">{v}%</span></span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                <ProvenanceLine>
                  <ProvenanceChip>{chars.source_label}</ProvenanceChip>
                </ProvenanceLine>
              </>
            ) : (
              <CompactEmpty>No published pupil-profile data for this school yet.</CompactEmpty>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>{school.postcode} · {districtLabel(district)} district</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Ward</dt><dd className="mt-0.5">{school.ward ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">District</dt><dd className="mt-0.5">{school.district ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Postcode area</dt><dd className="mt-0.5">{school.postcode}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Coordinates</dt><dd className="mt-0.5 tabular-nums">{school.lat != null ? school.lat.toFixed(4) : "—"}, {school.lng != null ? school.lng.toFixed(4) : "—"}</dd></div>
            </div>
            <ProvenanceLine><ProvenanceChip>Geocoded via postcodes.io · OS OGL</ProvenanceChip></ProvenanceLine>
          </CardContent>
        </Card>

        {/* Flood risk */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Flood risk</CardTitle>
            <CardDescription>Environment Agency Flood Map for Planning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {flood ? (
              <>
                {flood.flood_zone3 ? (
                  <div className="flex items-center gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">In Flood Zone 3 — high risk</p>
                      <p className="text-xs text-muted-foreground">Land assessed as having a 1-in-100 (river) or 1-in-200 (sea) annual chance of flooding.</p>
                    </div>
                  </div>
                ) : flood.flood_zone2 ? (
                  <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">In Flood Zone 2 — medium risk</p>
                      <p className="text-xs text-muted-foreground">Land assessed as having between a 1-in-100 and 1-in-1,000 annual chance of flooding.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Outside Flood Zones 2 &amp; 3</p>
                      <p className="text-xs text-muted-foreground">Not in the Environment Agency&apos;s assessed flood zones. Local surface-water risk may still apply.</p>
                    </div>
                  </div>
                )}
                <ProvenanceLine>
                  <ProvenanceChip>{flood.source_label ?? "EA Flood Map for Planning"}</ProvenanceChip>
                </ProvenanceLine>
              </>
            ) : (
              <CompactEmpty>No published flood-risk data for this school yet.</CompactEmpty>
            )}
          </CardContent>
        </Card>

        {/* Neighbourhood safety */}
        <Card className="mt-5">
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
              <CompactEmpty>No recorded-crime data available for this neighbourhood.</CompactEmpty>
            )}
            <ProvenanceLine>
              <ProvenanceChip>Police.uk street-level crime · LSOA · May 2026</ProvenanceChip>
            </ProvenanceLine>
          </CardContent>
        </Card>

        {/* Local market */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Local market</CardTitle>
            <CardDescription>
              Sold prices in {districtLabel(district)} · {districtPrices?.transactions ?? 0} sales · {districtPrices?.period ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {districtPrices && districtPrices.median != null ? (
              <>
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
              </>
            ) : (
              <CompactEmpty>No sold-price data available for this postcode district.</CompactEmpty>
            )}
          </CardContent>
        </Card>

        {/* Neighbourhood */}
        <Card className="mt-5">
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
                      <OfstedBadge ofsted={effectiveOfsted(s)} derivedSource={s.derived_ofsted_source} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CompactEmpty>No other schools found in this postcode district.</CompactEmpty>
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

function SummaryChip({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="truncate max-w-[16rem]">{value}</span>
    </span>
  );
}

function TimelineItem({
  date,
  type,
  badge,
  children,
}: {
  date: string;
  type: string;
  badge: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-3 pl-4">
      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-muted-foreground/40" />
      <span className="absolute left-[3px] top-5 bottom-0 w-px bg-border" />
      <div className="flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{date}</span>
          <span className="text-xs text-muted-foreground">· {type}</span>
          {badge && <OfstedBadge ofsted={badge} className="text-xs" />}
        </div>
        {children}
      </div>
    </div>
  );
}

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}
