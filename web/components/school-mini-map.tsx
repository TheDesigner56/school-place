"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { School } from "@/lib/utils";
import { effectiveOfsted, ofstedHsl } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * Small static map for a single school — one pin, no interaction.
 * Tapping the expand button toggles a taller view of the same area.
 */
export function SchoolMiniMap({ school, height = 220 }: { school: School; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const hasCoords = school.lat != null && school.lng != null;
  const [expanded, setExpanded] = useState(false);
  const currentHeight = expanded ? Math.max(height * 1.6, 360) : height;
  const color = ofstedHsl(effectiveOfsted(school));

  useEffect(() => {
    if (!ref.current || !hasCoords) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [school.lng, school.lat],
      zoom: 13,
      interactive: false,
      attributionControl: { compact: true },
    });
    map.on("load", () => {
      map.addSource("school", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [school.lng, school.lat] },
          properties: { name: school.name },
        },
      });
      map.addLayer({
        id: "school-pin",
        type: "circle",
        source: "school",
        paint: {
          "circle-radius": 9,
          "circle-color": color,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
    });
    return () => map.remove();
  }, [school, hasCoords, color]);

  if (!hasCoords) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30" style={{ height: currentHeight }}>
        <p className="text-sm text-muted-foreground">Coordinates unavailable for this school.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border" style={{ height: currentHeight }}>
      <div ref={ref} className="h-full w-full" />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="absolute right-2 top-2 rounded-md border border-border bg-card/90 p-1.5 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-accent"
        aria-label={expanded ? "Shrink map" : "Expand map"}
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
