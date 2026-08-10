import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, Calendar, Shield, Eye, Ruler, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProvenanceChip } from "@/components/provenance";
import { getMeta } from "@/lib/data";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How School Place sources, processes, and presents UK school data. Glass-box provenance: sources, dates, and the principle that estimation is a service and false precision is a lie.",
};

const sources = [
  {
    icon: Database,
    title: "Ofsted outcomes",
    description: "Official statistics, open government licence",
    body: "Grades, inspection dates, and publication dates from Ofsted's official management statistics, released under the Open Government Licence.",
    chips: ["calendar", "Source: gov.uk / Ofsted OGL"],
  },
  {
    icon: Ruler,
    title: "Geocoding",
    description: "Postcodes → coordinates",
    body: "School postcodes converted to latitude/longitude via postcodes.io, which uses Ordnance Survey Code-Point Open data (OGL).",
    chips: ["Source: postcodes.io · OS OGL"],
  },
  {
    icon: Eye,
    title: "School establishment data",
    description: "Identity, type, governance",
    body: "School type, local authority, MAT/trust, admissions policy, and pupil counts from Get Information About Schools (GIAS), Department for Education.",
    chips: ["Source: GIAS / DfE"],
  },
  {
    icon: Shield,
    title: "Map tiles",
    description: "OpenFreeMap — no API key, no bill",
    body: "Basemap tiles from OpenFreeMap, built on OpenStreetMap and Natural Earth data. No Mapbox, no proprietary key, no per-load charge.",
    chips: ["© OpenFreeMap · OSM · Natural Earth"],
  },
] as const;

const commitments = [
  "Present a modelled estimate as a measured fact.",
  "Show a number without its source and date.",
  "Colour a school red without text carrying the same meaning (colour is never the only signal).",
  "Charge for access to public information.",
  "Pretend coverage is complete where it is not — admissions, crime, and sold-price layers currently cover the original pilot region only.",
];

export default async function MethodologyPage() {
  const meta = await getMeta();
  return (
    <div className="container max-w-2xl py-6 sm:py-10">
      <Link href="/" className="press mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-card hover:bg-accent hover:text-foreground sm:mb-8">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to map
      </Link>

      {/* ── Header ─────────────────────────────────────── */}
      <p className="eyebrow">Glass-box provenance</p>
      <h1 className="mt-2.5 font-serif text-[2.4rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl">
        Methodology
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Glass-box provenance: every figure we show carries its source and the date it was true.
        We will not hide where data comes from, and we will not dress uncertainty as certainty.
      </p>

      {/* ── Principle ──────────────────────────────────── */}
      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-5 shadow-card">
        <p className="font-serif text-xl italic leading-relaxed tracking-tight">
          “Estimation is a service. False precision is a lie.”
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          We publish what we know, label what we don&apos;t, and never present a model&apos;s output as a measured fact.
        </p>
      </div>

      {/* ── Sources ────────────────────────────────────── */}
      <p className="eyebrow mt-10">Sources</p>
      <div className="mt-3 space-y-3">
        {sources.map((s, i) => (
          <Card
            key={s.title}
            className="hover-lift animate-rise"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-primary" /> {s.title}
              </CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="leading-relaxed">{s.body}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {s.chips.map((chip) =>
                  chip === "calendar" ? (
                    <ProvenanceChip key={chip}>
                      <Calendar className="h-3 w-3" /> {meta.data_as_of}
                    </ProvenanceChip>
                  ) : (
                    <ProvenanceChip key={chip}>{chip}</ProvenanceChip>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Honesty commitments ────────────────────────── */}
      <p className="eyebrow mt-10">What we will not do</p>
      <ul className="mt-3 divide-y divide-border/50 rounded-2xl border border-border/70 bg-card shadow-card">
        {commitments.map((item, i) => (
          <li
            key={item}
            className="flex items-start gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-accent/60 first:rounded-t-2xl last:rounded-b-2xl animate-rise"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="leading-relaxed text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      {/* ── National scope ─────────────────────────────── */}
      <p className="eyebrow mt-10">National scope</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        School Place now covers <span className="font-medium text-foreground">{meta.region}</span> —
        {" "}<span className="tabular-nums">{meta.schools.toLocaleString()}</span> schools. Ofsted grade distribution:
      </p>
      <ul className="mt-3 divide-y divide-border/50 rounded-2xl border border-border/70 bg-card px-4 text-sm shadow-card">
        {Object.entries(meta.by_grade)
          .sort((a, b) => b[1] - a[1])
          .map(([grade, count], i) => (
            <li
              key={grade}
              className="flex items-center justify-between gap-3 py-2.5 animate-rise"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="font-medium">{grade === "NULL" ? "Not judged" : grade}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
