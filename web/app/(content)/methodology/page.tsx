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

export default async function MethodologyPage() {
  const meta = await getMeta();
  return (
    <div className="container max-w-2xl py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to map
      </Link>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Methodology</h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Glass-box provenance: every figure we show carries its source and the date it was true.
        We will not hide where data comes from, and we will not dress uncertainty as certainty.
      </p>

      {/* Principle */}
      <Card className="mt-8 border-l-2 border-l-primary">
        <CardContent className="p-5">
          <p className="font-serif text-lg italic leading-relaxed">
            “Estimation is a service. False precision is a lie.”
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            We publish what we know, label what we don&apos;t, and never present a model&apos;s output as a measured fact.
          </p>
        </CardContent>
      </Card>

      {/* Sources */}
      <h2 className="mt-10 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources</h2>
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Ofsted outcomes</CardTitle>
            <CardDescription>Official statistics, open government licence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Grades, inspection dates, and publication dates from Ofsted&apos;s official management statistics, released under the Open Government Licence.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <ProvenanceChip><Calendar className="h-3 w-3" /> {meta.data_as_of}</ProvenanceChip>
              <ProvenanceChip>Source: gov.uk / Ofsted OGL</ProvenanceChip>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Ruler className="h-4 w-4" /> Geocoding</CardTitle>
            <CardDescription>Postcodes → coordinates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>School postcodes converted to latitude/longitude via postcodes.io, which uses Ordnance Survey Code-Point Open data (OGL).</p>
            <ProvenanceChip>Source: postcodes.io · OS OGL</ProvenanceChip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4" /> School establishment data</CardTitle>
            <CardDescription>Identity, type, governance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>School type, local authority, MAT/trust, admissions policy, and pupil counts from Get Information About Schools (GIAS), Department for Education.</p>
            <ProvenanceChip>Source: GIAS / DfE</ProvenanceChip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Map tiles</CardTitle>
            <CardDescription>OpenFreeMap — no API key, no bill</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Basemap tiles from OpenFreeMap, built on OpenStreetMap and Natural Earth data. No Mapbox, no proprietary key, no per-load charge.</p>
            <ProvenanceChip>© OpenFreeMap · OSM · Natural Earth</ProvenanceChip>
          </CardContent>
        </Card>
      </div>

      {/* Honesty commitments */}
      <h2 className="mt-10 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What we will not do</h2>
      <ul className="space-y-2 text-sm">
        {[
          "Present a modelled estimate as a measured fact.",
          "Show a number without its source and date.",
          "Colour a school red without text carrying the same meaning (colour is never the only signal).",
          "Charge for access to public information.",
          "Pretend coverage is complete where it is not — admissions, crime, and sold-price layers currently cover the original pilot region only.",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="leading-relaxed text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      {/* National scope */}
      <h2 className="mt-10 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">National scope</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        School Place now covers <span className="font-medium text-foreground">{meta.region}</span> —
        {" "}<span className="tabular-nums">{meta.schools.toLocaleString()}</span> schools. Ofsted grade distribution:
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {Object.entries(meta.by_grade)
          .sort((a, b) => b[1] - a[1])
          .map(([grade, count]) => (
            <li key={grade} className="flex items-center justify-between border-b border-border/60 py-1.5">
              <span>{grade === "NULL" ? "Not judged" : grade}</span>
              <span className="tabular-nums text-muted-foreground">{count}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}