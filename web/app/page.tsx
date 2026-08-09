import { SchoolMap } from "@/components/school-map";
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
      {/* Floating brand mark top-left (minimal, doesn't fight the map) */}
      <div className="pointer-events-none absolute left-3 top-3 z-[5] sm:left-4">
        <Link href="/" className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-1 text-sm font-semibold backdrop-blur-md">
          School<span className="text-muted-foreground"> Place</span>
        </Link>
      </div>
      {/* Meta strip — appears on wide screens, glass provenance */}
      <div className="pointer-events-none absolute right-3 top-3 z-[5] hidden text-right sm:block sm:right-4">
        <div className="pointer-events-auto rounded-md bg-background/70 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
          <span className="font-medium text-foreground">{meta.schools}</span> schools · {meta.region}
          <br />
          {meta.data_as_of}
        </div>
      </div>
    </main>
  );
}