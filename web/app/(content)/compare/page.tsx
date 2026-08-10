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
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/schools.json`)
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

  const slots = [
    { key: "a" as const, school: a, clear: () => setASlug(null), pick: () => setPicking("a"), title: "School A" },
    { key: "b" as const, school: b, clear: () => setBSlug(null), pick: () => setPicking("b"), title: "School B" },
  ];

  return (
    <div className="container max-w-5xl py-6 sm:py-10">
      <Link href="/" className="press mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-card hover:bg-accent hover:text-foreground sm:mb-8">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to map
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-border/60 pb-8">
        <p className="eyebrow">Side-by-side</p>
        <h1 className="mt-2.5 font-serif text-[2.4rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl">
          Compare schools
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Side-by-side metrics, honest and sourced.
        </p>
      </header>

      {!loaded && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

      {loaded && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {slots.map((slot, i) => (
            <Card key={slot.key} className="hover-lift animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <p className="eyebrow text-[9.5px]">{slot.title}</p>
                  <CardTitle className="mt-1.5 truncate text-base">
                    {slot.school ? slot.school.name : "Pick a school"}
                  </CardTitle>
                  {!slot.school && (
                    <CardDescription>No school selected yet</CardDescription>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {slot.school && (
                    <button
                      onClick={slot.clear}
                      className="press inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-card hover:bg-accent hover:text-foreground"
                      aria-label={`Clear ${slot.title}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={slot.pick}
                    className="press inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-card hover:bg-accent hover:text-foreground"
                  >
                    <Search className="h-3.5 w-3.5" /> {slot.school ? "Change" : "Select"}
                  </button>
                </div>
              </CardHeader>
              {slot.school && (
                <CardContent>
                  <Link
                    href={`/school/${slot.school.slug}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View full school page →
                  </Link>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Picker overlay */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-sm animate-fade-in" onClick={() => setPicking(null)}>
          <div className="glass w-full max-w-md overflow-hidden rounded-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border/50 p-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder={`Search for school ${picking.toUpperCase()}…`}
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setPicking(null)}
                className="press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-72 divide-y divide-border/50 overflow-auto">
              {pickResults.map((s, i) => (
                <li key={s.urn} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                  <button
                    onClick={() => choose(s.slug)}
                    className="-mx-0 flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm transition-colors hover:bg-accent/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{s.phase} · {s.postcode}</span>
                    </span>
                    <OfstedBadge ofsted={s.ofsted} className="shrink-0" />
                  </button>
                </li>
              ))}
              {pickQuery.trim().length >= 2 && pickResults.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Comparison table */}
      {a && b && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/40">
                  <th className="w-32 p-3.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Metric</th>
                  <th className="p-3.5 text-left font-serif text-base font-semibold tracking-tight">{a.name}</th>
                  <th className="p-3.5 text-left font-serif text-base font-semibold tracking-tight">{b.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-accent/50">
                    <td className="p-3.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{row.label}</td>
                    <td className="p-3.5">{row.render(a)}</td>
                    <td className="p-3.5">{row.render(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {a && b && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => { const t = aSlug; setASlug(bSlug); setBSlug(t); }}
            className="press inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-card hover:bg-accent hover:text-foreground"
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
    <Suspense
      fallback={
        <div className="container max-w-5xl py-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
