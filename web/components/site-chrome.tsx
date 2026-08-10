import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Map" },
  { href: "/league-tables", label: "Tables" },
  { href: "/compare", label: "Compare" },
  { href: "/methodology", label: "Methodology" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="press flex items-center gap-2.5 rounded-full">
          <BrandMark />
          <BrandWordmark />
        </Link>
        <nav className="-mr-2 flex items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <span className="ml-1.5 border-l border-border/60 pl-2.5">
            <ThemeToggle />
          </span>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-secondary/40">
      <div className="container py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-6 w-6 rounded-[7px]" />
              <BrandWordmark className="text-[15px]" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Honest UK schools &amp; catchment intelligence. Free, open, and sourced —
              all 21,990 schools across England.
            </p>
          </div>
          <div className="flex gap-14 text-[13px]">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Explore</p>
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="w-fit text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Provenance</p>
              <span className="text-muted-foreground">Ofsted outcomes as at 31 Aug 2025</span>
              <span className="text-muted-foreground">Map © OpenFreeMap · OSM · Natural Earth</span>
              <Link href="/methodology" className="w-fit text-muted-foreground transition-colors hover:text-foreground">
                Methodology &amp; sources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
