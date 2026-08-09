"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { School } from "@/lib/utils";
import { ofstedHsl } from "@/lib/utils";

/**
 * Small static map for a single school — one pin, no interaction.
 */
export function SchoolMiniMap({ school, height = 220 }: { school: School; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const hasCoords = school.lat != null && school.lng != null;
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
          "circle-color": ofstedHsl(school.ofsted),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
    });
    return () => map.remove();
  }, [school, hasCoords]);
  if (!hasCoords) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30" style={{ height }}>
        <p className="text-sm text-muted-foreground">Coordinates unavailable for this school.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border" style={{ height }}>
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}