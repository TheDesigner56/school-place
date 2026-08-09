import { cn, ofstedLabel, ofstedToken } from "@/lib/utils";

/**
 * Ofsted grade chip — uses the semantic colour tokens.
 * A coloured dot + label keeps colour from dominating; text carries the meaning (WCAG).
 */
export function OfstedBadge({
  ofsted,
  className,
  showDate = false,
  date,
}: {
  ofsted: string | null;
  className?: string;
  showDate?: boolean;
  date?: string | null;
}) {
  const label = ofstedLabel(ofsted as never);
  const token = ofstedToken(ofsted as never);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: `hsl(var(--ofsted-${token}))` }}
        aria-hidden
      />
      <span>{label}</span>
      {showDate && date && <span className="text-muted-foreground">· {date}</span>}
    </span>
  );
}