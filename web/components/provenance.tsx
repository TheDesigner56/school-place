import { cn } from "@/lib/utils";

/**
 * Glass-box provenance chip — source + date on every figure.
 * The signature "honest data" element: set in mono like a citation,
 * never let a number float without its origin.
 */
export function ProvenanceChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted-foreground",
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 opacity-70" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {children}
    </span>
  );
}

/** Provenance line used in footer of cards / sections. */
export function ProvenanceLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 border-t border-border/50 pt-3 text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
