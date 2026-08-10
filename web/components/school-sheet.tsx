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

  // Exit faster than enter (220ms out vs 450ms in), then unmount via parent.
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(onClose, 210);
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
          "fixed inset-0 z-30 bg-foreground/20",
          closing ? "animate-fade-out" : "animate-fade-in"
        )}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[62vh] flex-col sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-full sm:max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label={school.name}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col rounded-t-3xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl sm:rounded-3xl",
            closing ? "animate-sheet-down" : "animate-sheet-up"
          )}
        >
          {/* Drag handle + close */}
          <div className="relative flex justify-center px-4 pb-1 pt-2.5">
            <button
              onClick={requestClose}
              className="flex w-16 justify-center rounded-full py-1.5"
              aria-label="Close sheet"
            >
              <span className="h-1.5 w-11 rounded-full bg-muted-foreground/25" />
            </button>
            <button
              onClick={requestClose}
              className="press absolute right-3 top-3 rounded-full bg-muted/70 p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3.5 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1.5">
            {/* Header */}
            <div className="animate-rise" style={{ animationDelay: "40ms" }}>
              <h2 className="font-serif text-[1.65rem] font-semibold leading-snug tracking-tight sm:text-3xl">
                {school.name}
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground/80">
                  {school.phase}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {school.postcode}
                </span>
                <span aria-hidden>·</span>
                <span>{school.la}</span>
              </p>
            </div>

            {/* Grade + quick stats */}
            <div
              className="flex flex-wrap items-center gap-2 animate-rise"
              style={{ animationDelay: "90ms" }}
            >
              <OfstedBadge
                ofsted={grade}
                derivedSource={school.derived_ofsted_source}
                className="px-3 py-1 text-sm"
              />
              {school.pupils != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="tabular-nums">{school.pupils.toLocaleString()}</span> pupils
                </span>
              )}
              {school.ofsted_date && (
                <span className="text-xs text-muted-foreground">
                  Inspected {formatOfstedDate(school.ofsted_date)}
                </span>
              )}
            </div>

            {/* Stat chips (limited to schools.json fields) */}
            <div
              className="grid grid-cols-3 gap-2 animate-rise"
              style={{ animationDelay: "140ms" }}
            >
              <StatChip icon={School2} label="Phase" value={school.phase} />
              <StatChip
                icon={Users}
                label="Pupils"
                value={school.pupils != null ? school.pupils.toLocaleString() : "—"}
              />
              <StatChip
                icon={MapPin}
                label="Local authority"
                value={school.la}
                truncate
              />
            </div>

            {/* Catchment note — honest label, brand-tinted callout */}
            <p
              className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground animate-rise"
              style={{ animationDelay: "190ms" }}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{reachLabel(school, reach)}</span>
            </p>

            {/* Footer CTA */}
            <Link
              href={`/school/${school.slug}`}
              onClick={requestClose}
              className="press flex h-12 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 animate-rise"
              style={{ animationDelay: "240ms" }}
            >
              View school <ArrowRight className="h-4 w-4" />
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
    <div className="flex flex-col justify-center rounded-xl border border-border bg-muted/40 px-3 py-2.5">
      <span className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", truncate && "truncate")}>
        {value}
      </span>
    </div>
  );
}
