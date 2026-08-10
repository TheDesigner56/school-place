"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import Fuse from "fuse.js";
import { Search, X, SlidersHorizontal, MapPin, HelpCircle } from "lucide-react";
import type { School } from "@/lib/utils";
import { effectiveOfsted, ofstedHsl, ofstedLabel, PHASES, cn } from "@/lib/utils";
import { SchoolSheet } from "@/components/school-sheet";

/**
 * Map-first home. MapLibre GL with OpenFreeMap tiles (no API key).
 * All ~22,000 schools as colour-coded circle pins. Search (Fuse.js), phase filters.
 * The map IS the home screen; search + filters float as glass panels over it.
 * Tap a pin to open an AllTrails-style bottom sheet.
 */

const DEFAULT_REACH_METRES: Record<string, number> = {
  Primary: 1600,
  Secondary: 3000,
  Nursery: 1600,
  Special: 3000,
  PRU: 3000,
};

export function SchoolMap({ schools, reach = {} }: { schools: School[]; reach?: Record<number, { min: number; max: number }> }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [query, setQuery] = useState("");
  const [activePhases, setActivePhases] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<School | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showReach, setShowReach] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(schools, {
        keys: [
          { name: "name", weight: 0.7 },
          { name: "postcode", weight: 0.2 },
          { name: "ward", weight: 0.1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [schools]
  );

  // Initialise map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-2.58, 51.42],
      zoom: 10.5,
      attributionControl: { compact: true },
      scrollZoom: true,
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("schools", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      // Confidence-gradient: reach washes UNDER the pins (only meaningful where data exists).
      map.addSource("reach", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      const bands: Array<[string, number]> = [
        ["reach-core", 0.14],
        ["reach-mid", 0.08],
        ["reach-outer", 0.04],
      ];
      for (const [id, opacity] of bands) {
        map.addLayer({
          id,
          type: "fill",
          source: "reach",
          filter: ["==", ["get", "band"], id],
          paint: {
            "fill-color": "hsl(178, 70%, 32%)",
            "fill-opacity": opacity,
          },
          layout: { visibility: "none" },
        });
      }
      map.addLayer({
        id: "reach-edge",
        type: "line",
        source: "reach",
        filter: ["==", ["get", "band"], "reach-outer"],
        paint: { "line-color": "hsl(178, 70%, 32%)", "line-opacity": 0.4, "line-width": 1.5, "line-dasharray": [2, 2] },
        layout: { visibility: "none" },
      });

      // Circle layer — colour by effective Ofsted grade (derived first, official fallback).
      map.addLayer({
        id: "schools-circle",
        type: "circle",
        source: "schools",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 13, 7, 16, 12],
          "circle-color": [
            "match",
            ["get", "effective"],
            "Outstanding", "hsl(152,56%,34%)",
            "Good", "hsl(212,80%,42%)",
            "Requires Improvement", "hsl(38,92%,42%)",
            "Inadequate", "hsl(0,72%,45%)",
            "hsl(220,8%,55%)"
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.92,
        },
      });
      // Labels on zoom-in
      map.addLayer({
        id: "schools-label",
        type: "symbol",
        source: "schools",
        minzoom: 12,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-max-width": 12,
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": "#1c1f26",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Selected-school catchment guide circle (dashed line + soft fill so it reads at a glance).
      map.addSource("selection-circle", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer(
        {
          id: "selection-circle-fill",
          type: "fill",
          source: "selection-circle",
          paint: {
            "fill-color": "hsl(178, 70%, 32%)",
            "fill-opacity": 0.07,
          },
        },
        "schools-circle" // wash sits under the pins
      );
      map.addLayer({
        id: "selection-circle-line",
        type: "line",
        source: "selection-circle",
        paint: {
          "line-color": "hsl(178, 70%, 30%)",
          "line-width": 2.5,
          "line-dasharray": [3, 2],
          "line-opacity": 0.85,
        },
      });

      // Cursor + click → select
      map.on("mouseenter", "schools-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "schools-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "schools-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const s = schools.find((x) => x.urn === f.properties?.urn);
        if (s) selectSchool(s);
      });
      updateSource();
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools]);

  // Filtered schools derived from search + phase filters
  const filtered = useMemo(() => {
    let list = schools;
    if (activePhases.size > 0) {
      list = list.filter((s) => activePhases.has(s.phase));
    }
    if (query.trim().length >= 2) {
      list = fuse.search(query).map((r) => r.item).filter((s) => list.includes(s));
    }
    return list;
  }, [schools, query, activePhases, fuse]);

  const updateSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("schools")) return;
    const features = filtered.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      properties: {
        urn: s.urn,
        name: s.name,
        effective: effectiveOfsted(s) ?? "Not judged",
      },
    }));
    (map.getSource("schools") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
  }, [filtered]);

  useEffect(() => {
    updateSource();
  }, [updateSource]);

  // Select a school: fly to it, open sheet, auto-enable reach washes when real data exists.
  const selectSchool = useCallback((s: School) => {
    const map = mapRef.current;
    if (map) map.flyTo({ center: [s.lng, s.lat], zoom: 14, duration: 800 });
    setSelected(s);
    if (reach[s.urn]) {
      setShowReach(true);
    }
  }, [reach]);

  // Update the dashed catchment circle when selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("selection-circle")) return;
    if (!selected) {
      (map.getSource("selection-circle") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const r = reach[selected.urn];
    const radius = r ? (r.min + r.max) / 2 : DEFAULT_REACH_METRES[selected.phase] ?? 1600;
    const feature: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: circlePoly(selected.lng, selected.lat, radius) },
      properties: {},
    };
    (map.getSource("selection-circle") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [feature] });
  }, [selected, reach]);

  // Toggle the confidence-gradient reach washes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("reach")) return;
    const vis = showReach ? "visible" : "none";
    for (const id of ["reach-core", "reach-mid", "reach-outer", "reach-edge"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
    if (showReach) {
      const features: GeoJSON.Feature[] = [];
      for (const s of schools) {
        const r = reach[s.urn];
        if (!r || !s.lat || !s.lng) continue;
        const { min, max } = r;
        const mid = (min + max) / 2;
        features.push(
          { type: "Feature", geometry: { type: "Polygon", coordinates: circlePoly(s.lng, s.lat, max) }, properties: { band: "reach-outer" } },
          { type: "Feature", geometry: { type: "Polygon", coordinates: circlePoly(s.lng, s.lat, mid) }, properties: { band: "reach-mid" } },
          { type: "Feature", geometry: { type: "Polygon", coordinates: circlePoly(s.lng, s.lat, min) }, properties: { band: "reach-core" } },
        );
      }
      (map.getSource("reach") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReach, schools, reach]);

  // Approximate a circle polygon around [lng,lat] with radius r metres.
  const circlePoly = (lng: number, lat: number, r: number, steps = 64) => {
    const coords: Array<[number, number]> = [];
    const dLat = r / 111320;
    const dLng = r / (111320 * Math.cos((lat * Math.PI) / 180));
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
    }
    return [coords];
  };

  // Search box input handler
  const onSearch = useCallback(
    (val: string) => {
      setQuery(val);
      if (val.trim().length >= 2) {
        const r = fuse.search(val).slice(0, 6).map((x) => x.item);
        setSearchResults(r);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    },
    [fuse]
  );

  const flyToSchool = (s: School) => {
    selectSchool(s);
    setShowResults(false);
  };

  const togglePhase = (p: string) => {
    setActivePhases((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const legendItems = [
    ["Outstanding", "hsl(var(--ofsted-outstanding))"],
    ["Good", "hsl(var(--ofsted-good))"],
    ["Requires Improvement", "hsl(var(--ofsted-requires))"],
    ["Inadequate", "hsl(var(--ofsted-inadequate))"],
    ["Not judged / no data", "hsl(var(--ofsted-none))"],
  ] as const;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top glass panel: search + filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2">
          {/* Search — floating glass pill */}
          <div className="relative">
            <div className="flex items-center rounded-full border border-border/70 bg-card/85 shadow-xl shadow-foreground/5 backdrop-blur-md transition-shadow focus-within:shadow-2xl focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                onFocus={() => query.trim().length >= 2 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                placeholder="Search 21,990 schools by name or postcode"
                className="h-12 w-full bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search schools"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setSearchResults([]); setShowResults(false); }}
                  className="press mr-1 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "press mr-1.5 flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium",
                  showFilters || activePhases.size > 0
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent"
                )}
                aria-label="Toggle filters"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activePhases.size > 0 && (
                  <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] tabular-nums">
                    {activePhases.size}
                  </span>
                )}
              </button>
            </div>
            {/* Search dropdown */}
            {showResults && searchResults.length > 0 && (
              <ul className="absolute inset-x-0 top-[3.5rem] z-20 overflow-hidden rounded-2xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur-md animate-slide-up">
                {searchResults.map((s, i) => {
                  const grade = effectiveOfsted(s);
                  return (
                    <li key={s.urn} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); flyToSchool(s); }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{s.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {s.postcode}
                            </span>
                            {" · "}{s.phase}
                          </span>
                        </span>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
                          style={{ backgroundColor: ofstedHsl(grade) }}
                          title={ofstedLabel(grade)}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Filter chips */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-card/85 p-2.5 shadow-xl shadow-foreground/5 backdrop-blur-md animate-slide-up">
              <span className="px-1 text-xs text-muted-foreground">Phase:</span>
              {PHASES.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePhase(p)}
                  className={cn(
                    "press rounded-full border px-3 py-1 text-xs font-medium",
                    activePhases.has(p)
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
              {activePhases.size > 0 && (
                <button
                  onClick={() => setActivePhases(new Set())}
                  className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              )}
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              <button
                onClick={() => setShowReach((v) => !v)}
                className={cn(
                  "press rounded-full border px-3 py-1 text-xs font-medium",
                  showReach
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-primary/40 bg-card text-primary hover:bg-accent"
                )}
                title="Show published last-distance-offered as confidence washes (where data exists)"
              >
                Reach
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend — compact info popover */}
      <div className="pointer-events-none absolute bottom-6 left-3 z-10 sm:left-4">
        <div className="pointer-events-auto">
          <button
            onClick={() => setShowLegend((v) => !v)}
            className={cn(
              "press flex h-10 w-10 items-center justify-center rounded-full border border-border/70 shadow-xl shadow-foreground/5 backdrop-blur-md",
              showLegend ? "bg-primary text-primary-foreground" : "bg-card/85 text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            aria-label="Ofsted legend"
            aria-expanded={showLegend}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          {showLegend && (
            <div className="absolute bottom-12 left-0 w-60 rounded-2xl border border-border bg-card/95 p-3.5 shadow-xl backdrop-blur-md animate-slide-up">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ofsted grade
              </p>
              <ul className="flex flex-col gap-2 text-xs">
                {legendItems.map(([label, color], i) => (
                  <li key={label} className="flex items-center gap-2.5 animate-rise" style={{ animationDelay: `${i * 35}ms` }}>
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ backgroundColor: color }} />
                    <span className="text-foreground/80">{label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
                Derived grades (post-2024) shown where no official headline exists.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Result count — bottom-center */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="rounded-full border border-border/70 bg-card/85 px-3.5 py-1.5 text-xs text-muted-foreground shadow-xl shadow-foreground/5 backdrop-blur-md tabular-nums">
          <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span>
          {" "}of {schools.length.toLocaleString()} schools
        </div>
      </div>

      {/* Selected school bottom sheet */}
      {selected && (
        <SchoolSheet school={selected} onClose={() => setSelected(null)} reach={reach} />
      )}
    </div>
  );
}
