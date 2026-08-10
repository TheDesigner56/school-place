"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Users, MapPin, School2, ArrowRight } from "lucide-react";
import { OfstedBadge } from "@/components/ofsted-badge";
import { cn, effectiveOfsted, formatOfstedDate, type School } from "@/lib/utils";

const REACH_DEFAULT_METRES: Record<string, number> = {
  Primary: 1600,
  Secondary: 3000,
  Nursery: 1600,
  Special: 3000,
  PRU: 3000,
};

function reachLabel(school: School, reach?: Record<number, { min: number; max: number }>) {
  const r = reach?.[school.urn];
  if (r) {
    const min = r.min >= 1000 ? `${(r.min / 1000).toFixed(1)} km` : `${Math.round(r.min)} m`;
    const max = r.max >= 1000 ? `${(r.max / 1000).toFixed(1)} km` : `${Math.round(r.max)} m`;
    return `Published last-distance: ${min}–${max}`;
  }
  const phase = school.phase ?? "Primary";
  const metres = REACH_DEFAULT_METRES[phase] ?? 1600;
  const miles = metres >= 1609 ? `${(metres / 1609).toFixed(1)} miles` : `${Math.round(metres / 1609 * 10) / 10} miles`;
  const milesLabel = miles === "1" ? "1 mile" : `${miles} miles`;
  return `Catchment guide (${milesLabel} radius — actual data where published)`;
}

export function SchoolSheet({
  school,
  onClose,
  reach,
}: {
  school: School;
  onClose: () => void;
  reach?: Record<number, { min: number; max: number }>;
}) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exit faster than enter (190ms out vs 440ms in), then unmount via parent.
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(onClose, 180);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, closing]);

  const grade = effectiveOfsted(school);

  return (
    <>
      {/* Backdrop dim — tap anywhere outside to dismiss */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-foreground/25 backdrop-blur-[1px]",
          closing ? "animate-fade-out" : "animate-fade-in"
        )}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[68vh] flex-col sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-full sm:max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label={school.name}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col rounded-t-[28px] border border-b-0 border-border/70 bg-card/95 backdrop-blur-2xl shadow-sheet sm:rounded-[24px] sm:border-b",
            closing ? "animate-sheet-down" : "animate-sheet-up"
          )}
        >
          {/* Drag handle + close */}
          <div className="relative flex justify-center px-4 pb-0.5 pt-2.5">
            <button
              onClick={requestClose}
              className="flex w-20 justify-center rounded-full py-2"
              aria-label="Close sheet"
            >
              <span className="h-[5px] w-10 rounded-full bg-muted-foreground/25" />
            </button>
            <button
              onClick={requestClose}
              className="press absolute right-3.5 top-3.5 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
            {/* Header */}
            <div className="animate-rise" style={{ animationDelay: "40ms" }}>
              <div className="flex flex-wrap items-center gap-2">
                <OfstedBadge ofsted={grade} derivedSource={school.derived_ofsted_source} />
                <span className="inline-flex items-center rounded-full border border-border/70 bg-card px-2.5 py-0.5 text-xs font-medium text-foreground/75">
                  {school.phase}
                </span>
              </div>
              <h2 className="mt-2.5 font-serif text-[1.7rem] font-semibold leading-[1.12] tracking-tight">
                {school.name}
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {school.postcode}
                </span>
                <span aria-hidden>·</span>
                <span>{school.la}</span>
                {school.ofsted_date && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">Inspected {formatOfstedDate(school.ofsted_date)}</span>
                  </>
                )}
              </p>
            </div>

            {/* Stat strip */}
            <div
              className="grid grid-cols-3 gap-2 animate-rise"
              style={{ animationDelay: "90ms" }}
            >
              <StatChip icon={School2} label="Phase" value={school.phase} />
              <StatChip
                icon={Users}
                label="Pupils"
                value={school.pupils != null ? school.pupils.toLocaleString() : "—"}
              />
              <StatChip
                icon={MapPin}
                label="Authority"
                value={school.la}
                truncate
              />
            </div>

            {/* Catchment note — honest label, brand-tinted callout */}
            <p
              className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3.5 py-3 text-xs leading-relaxed text-muted-foreground animate-rise"
              style={{ animationDelay: "140ms" }}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{reachLabel(school, reach)}</span>
            </p>

            {/* Footer CTA */}
            <Link
              href={`/school/${school.slug}`}
              onClick={requestClose}
              className="press group flex h-12 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90 animate-rise"
              style={{ animationDelay: "190ms" }}
            >
              View school
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  truncate,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2.5">
      <span className="mb-0.5 inline-flex items-center gap-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", truncate && "truncate")}>
        {value}
      </span>
    </div>
  );
}
