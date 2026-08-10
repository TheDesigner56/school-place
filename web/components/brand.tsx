import { cn } from "@/lib/utils";

/**
 * Brand mark — a spruce "place pin" tile. The pin doubles as a school bell:
 * location first, institution second. Used in the header and on the map home.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary text-primary-foreground shadow-card",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-6.5-5.2-6.5-10a6.5 6.5 0 1 1 13 0c0 4.8-6.5 10-6.5 10Z" />
        <circle cx="12" cy="10.5" r="2.1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif text-[17px] font-semibold tracking-tight", className)}>
      <span className="text-primary">School</span>
      <span className="text-foreground/75"> Place</span>
    </span>
  );
}
