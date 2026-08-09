import { SchoolMap } from "@/components/school-map";
import { getSchools, getMeta } from "@/lib/data";
import Link from "next/link";

export default async function HomePage() {
  const [schools, meta] = await Promise.all([getSchools(), getMeta()]);
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <SchoolMap schools={schools} />
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