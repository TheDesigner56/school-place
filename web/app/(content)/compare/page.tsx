"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Search, X } from "lucide-react";
import Fuse from "fuse.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfstedBadge } from "@/components/ofsted-badge";
import { ProvenanceChip } from "@/components/provenance";
import { formatOfstedDate, ofstedLabel } from "@/lib/utils";
import type { School } from "@/lib/utils";

function CompareInner() {
  const searchParams = useSearchParams();
  const [schools, setSchools] = useState<School[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [aSlug, setASlug] = useState<string | null>(searchParams.get("a"));
  const [bSlug, setBSlug] = useState<string | null>(searchParams.get("b"));
  const [picking, setPicking] = useState<"a" | "b" | null>(null);
  const [pickQuery, setPickQuery] = useState("");

  useEffect(() => {
    fetch("/data/schools.json")
      .then((r) => r.json())
      .then((d: School[]) => {
        setSchools(d);
        setLoaded(true);
      });
  }, []);

  // sync URL when selections change
  useEffect(() => {
    const params = new URLSearchParams();
    if (aSlug) params.set("a", aSlug);
    if (bSlug) params.set("b", bSlug);
    const url = params.toString() ? `/compare?${params.toString()}` : "/compare";
    window.history.replaceState(null, "", url);
  }, [aSlug, bSlug]);

  const fuse = new Fuse(schools, {
    keys: [{ name: "name", weight: 0.8 }, { name: "postcode", weight: 0.2 }],
    threshold: 0.4,
    minMatchCharLength: 2,
  });

  const a = schools.find((s) => s.slug === aSlug);
  const b = schools.find((s) => s.slug === bSlug);

  const pickResults = pickQuery.trim().length >= 2
    ? fuse.search(pickQuery).slice(0, 6).map((r) => r.item)
    : [];

  const choose = (slug: string) => {
    if (picking === "a") setASlug(slug);
    else if (picking === "b") setBSlug(slug);
    setPicking(null);
    setPickQuery("");
  };

  const rows: { label: string; render: (s: School | undefined) => React.ReactNode }[] = [
    { label: "Ofsted", render: (s) => <OfstedBadge ofsted={s?.ofsted ?? null} /> },
    { label: "Inspection date", render: (s) => <span className="tabular-nums">{formatOfstedDate(s?.ofsted_date ?? null)}</span> },
    { label: "Phase", render: (s) => s?.phase ?? "—" },
    { label: "Type", render: (s) => s?.type ?? "—" },
    { label: "Local authority", render: (s) => s?.la ?? "—" },
    { label: "Pupils", render: (s) => (s?.pupils != null ? <span className="tabular-nums">{s.pupils}</span> : "—") },
    { label: "Postcode", render: (s) => s?.postcode ?? "—" },
    { label: "Ward", render: (s) => s?.ward ?? "—" },
    { label: "MAT / trust", render: (s) => s?.mat ?? "No MAT" },
    { label: "Admissions", render: (s) => s?.admissions_policy ?? "—" },
  ];

  return (
    <div className="container max-w-5xl py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to map
      </Link>
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Compare schools</h1>
      <p className="mt-2 text-sm text-muted-foreground">Side-by-side metrics, honest and sourced.</p>

      {!loaded && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

      {loaded && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Column A */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">School A</CardTitle>
                <CardDescription>{a ? a.name : "Pick a school"}</CardDescription>
              </div>
              <div className="flex gap-1">
                {a && (
                  <button onClick={() => setASlug(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Clear A">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setPicking("a")} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
                  <Search className="h-3 w-3" /> {a ? "Change" : "Select"}
                </button>
              </div>
            </CardHeader>
            {a && (
              <CardContent className="space-y-1.5 text-sm">
                <p className="text-xs text-muted-foreground"><Link href={`/school/${a.slug}`} className="hover:underline">View full school page →</Link></p>
              </CardContent>
            )}
          </Card>

          {/* Column B */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">School B</CardTitle>
                <CardDescription>{b ? b.name : "Pick a school"}</CardDescription>
              </div>
              <div className="flex gap-1">
                {b && (
                  <button onClick={() => setBSlug(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Clear B">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setPicking("b")} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
                  <Search className="h-3 w-3" /> {b ? "Change" : "Select"}
                </button>
              </div>
            </CardHeader>
            {b && (
              <CardContent className="space-y-1.5 text-sm">
                <p className="text-xs text-muted-foreground"><Link href={`/school/${b.slug}`} className="hover:underline">View full school page →</Link></p>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Picker overlay */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20" onClick={() => setPicking(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder={`Search for school ${picking.toUpperCase()}…`}
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => setPicking(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-72 overflow-auto">
              {pickResults.map((s) => (
                <li key={s.urn}>
                  <button onClick={() => choose(s.slug)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.phase} · {s.postcode}</span>
                    </span>
                    <OfstedBadge ofsted={s.ofsted} className="shrink-0" />
                  </button>
                </li>
              ))}
              {pickQuery.trim().length >= 2 && pickResults.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matches</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Comparison table */}
      {a && b && (
        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-32 p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Metric</th>
                <th className="p-3 text-left font-medium">{a.name}</th>
                <th className="p-3 text-left font-medium">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 ? "bg-muted/20" : ""}>
                  <td className="p-3 text-xs text-muted-foreground">{row.label}</td>
                  <td className="p-3">{row.render(a)}</td>
                  <td className="p-3">{row.render(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {a && b && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => { const t = aSlug; setASlug(bSlug); setBSlug(t); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> Swap
          </button>
          <ProvenanceChip>Ofsted outcomes as at 31 Aug 2025</ProvenanceChip>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="container max-w-5xl py-8"><p className="text-sm text-muted-foreground">Loading…</p></div>}>
      <CompareInner />
    </Suspense>
  );
}