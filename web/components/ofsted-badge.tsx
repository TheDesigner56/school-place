import { Info } from "lucide-react";
import { cn, ofstedLabel, ofstedToken, derivedTooltip, type School } from "@/lib/utils";

/**
 * Ofsted grade chip — uses the semantic colour tokens.
 * Flighty-style status chip: the grade colour tints the chip itself (soft fill +
 * coloured border) so status reads in <1s, while the label carries the meaning (WCAG).
 * Supports a "derived" marker when the headline grade is not an official Ofsted label.
 */
export function OfstedBadge({
  ofsted,
  className,
  showDate = false,
  date,
  derivedSource,
}: {
  ofsted: string | null;
  className?: string;
  showDate?: boolean;
  date?: string | null;
  derivedSource?: School["derived_ofsted_source"];
}) {
  const label = ofstedLabel(ofsted as never);
  const token = ofstedToken(ofsted as never);
  const derived = derivedSource != null && derivedSource !== "official";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{
        backgroundColor: `hsl(var(--ofsted-${token}) / 0.10)`,
        borderColor: `hsl(var(--ofsted-${token}) / 0.30)`,
      }}
    >
      <span
        className="h-2 w-2 rounded-full ring-2"
        style={{
          backgroundColor: `hsl(var(--ofsted-${token}))`,
          ["--tw-ring-color" as string]: `hsl(var(--ofsted-${token}) / 0.25)`,
        }}
        aria-hidden
      />
      <span>{label}</span>
      {showDate && date && <span className="font-normal text-muted-foreground">· {date}</span>}
      {derived && (
        <span
          className="inline-flex items-center"
          title={derivedTooltip(derivedSource as NonNullable<School["derived_ofsted_source"]>)}
        >
          <Info className="h-3 w-3 text-muted-foreground" aria-label="Derived grade" />
        </span>
      )}
    </span>
  );
}
