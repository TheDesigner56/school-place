import Link from "next/link";
import { Compass } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Compass className="h-5 w-5 text-primary" />
          <span className="text-[15px]">
            School<span className="text-muted-foreground"> Place</span>
          </span>
        </Link>
        <nav className="-mr-3 flex items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
          <Link href="/" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3">Map</Link>
          <Link href="/league-tables" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3">Tables</Link>
          <Link href="/compare" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3">Compare</Link>
          <Link href="/methodology" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3">Methodology</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-foreground">School Place</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed">
              Honest UK schools &amp; catchment intelligence. Free, open, and sourced.
              Pilot region: Bath &amp; North East Somerset + Bristol.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-xs md:text-right">
            <Link href="/methodology" className="hover:text-foreground">Methodology &amp; sources</Link>
            <span>Ofsted outcomes as at 31 August 2025</span>
            <span>Map © OpenFreeMap · OSM · Natural Earth</span>
          </div>
        </div>
      </div>
    </footer>
  );
}