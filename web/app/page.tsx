import { SchoolMap } from "@/components/school-map";
import { BrandMark, BrandWordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSchools, getMeta, getAdmissions } from "@/lib/data";
import Link from "next/link";

export default async function HomePage() {
  const [schools, meta, admissions] = await Promise.all([getSchools(), getMeta(), getAdmissions()]);
  // Compact reach map: urn -> { min, max } of published last-distance-offered (metres)
  const reach: Record<number, { min: number; max: number }> = {};
  for (const [urn, a] of Object.entries(admissions)) {
    const ds = a.years.map((y) => y.last_distance_m).filter((d): d is number => d != null);
    if (ds.length) reach[Number(urn)] = { min: Math.min(...ds), max: Math.max(...ds) };
  }
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <SchoolMap schools={schools} reach={reach} />
      {/* Brand chip — top-left, only when the centred search column leaves room */}
      <div className="pointer-events-none absolute left-4 top-4 z-[5] hidden xl:block">
        <Link
          href="/"
          className="press glass pointer-events-auto inline-flex h-[52px] items-center gap-2.5 rounded-full pl-3 pr-4"
        >
          <BrandMark />
          <BrandWordmark />
        </Link>
      </div>
      {/* Meta strip + theme — top-right, glass provenance */}
      <div className="pointer-events-none absolute right-3 top-3 z-[5] flex items-center gap-2 sm:right-4 sm:top-4">
        <div className="glass pointer-events-auto hidden rounded-full px-3.5 py-1.5 text-[11px] text-muted-foreground tabular-nums xl:block">
          <span className="font-semibold text-foreground">{meta.schools.toLocaleString()}</span> schools · {meta.region} · {meta.data_as_of}
        </div>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
