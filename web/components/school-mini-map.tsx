"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { School } from "@/lib/utils";
import { effectiveOfsted, ofstedHsl } from "@/lib/utils";
import { currentMapStyle, isDarkTheme, onThemeChange } from "@/lib/map-style";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * Small static map for a single school — one pin, no interaction.
 * Theme-aware basemap (OpenFreeMap liberty / dark). Tapping the expand
 * button toggles a taller view of the same area.
 */
export function SchoolMiniMap({ school, height = 240 }: { school: School; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasCoords = school.lat != null && school.lng != null;
  const [expanded, setExpanded] = useState(false);
  const currentHeight = expanded ? Math.max(height * 1.6, 380) : height;
  const color = ofstedHsl(effectiveOfsted(school));

  useEffect(() => {
    if (!ref.current || !hasCoords) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: currentMapStyle(),
      center: [school.lng, school.lat],
      zoom: 13,
      interactive: false,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const addPin = () => {
      if (map.getSource("school")) return;
      const dark = isDarkTheme();
      map.addSource("school", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [school.lng, school.lat] },
          properties: { name: school.name },
        },
      });
      // Soft halo + pin, so the marker reads on both basemaps
      map.addLayer({
        id: "school-halo",
        type: "circle",
        source: "school",
        paint: {
          "circle-radius": 16,
          "circle-color": color,
          "circle-opacity": 0.22,
        },
      });
      map.addLayer({
        id: "school-pin",
        type: "circle",
        source: "school",
        paint: {
          "circle-radius": 8.5,
          "circle-color": color,
          "circle-stroke-color": dark ? "rgba(8, 14, 15, 0.9)" : "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
    };

    map.on("load", addPin);
    const offTheme = onThemeChange(() => {
      map.setStyle(currentMapStyle());
      const rebuild = () => {
        if (!map.isStyleLoaded()) {
          map.once("styledata", rebuild);
          return;
        }
        addPin();
      };
      map.once("styledata", rebuild);
    });

    return () => {
      offTheme();
      map.remove();
      mapRef.current = null;
    };
  }, [school, hasCoords, color]);

  if (!hasCoords) {
    return (
      <div className="surface flex items-center justify-center rounded-2xl" style={{ height: currentHeight }}>
        <p className="text-sm text-muted-foreground">Coordinates unavailable for this school.</p>
      </div>
    );
  }

  return (
    <div className="surface relative overflow-hidden rounded-2xl" style={{ height: currentHeight }}>
      <div ref={ref} className="h-full w-full" />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="press glass absolute right-2.5 top-2.5 rounded-full p-2 text-muted-foreground hover:text-foreground"
        aria-label={expanded ? "Shrink map" : "Expand map"}
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
