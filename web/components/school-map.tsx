"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import Fuse from "fuse.js";
import Link from "next/link";
import { Search, X, SlidersHorizontal, MapPin } from "lucide-react";
import type { School } from "@/lib/utils";
import { ofstedHsl, ofstedLabel, PHASES, cn } from "@/lib/utils";

/**
 * Map-first home. MapLibre GL with OpenFreeMap tiles (no API key).
 * All 236 schools as colour-coded circle pins. Search (Fuse.js), phase filters.
 * The map IS the home screen; search + filters float as glass panels over it.
 */

const OFSTED_CASE_MATCH = [
  ["Outstanding", "hsl(152,56%,34%)"],
  ["Good", "hsl(212,80%,42%)"],
  ["Requires Improvement", "hsl(38,92%,42%)"],
  ["Inadequate", "hsl(0,72%,45%)"],
  ["Not judged", "hsl(220,8%,55%)"],
  ["NULL", "hsl(220,8%,55%)"],
] as const;

export function SchoolMap({ schools, reach = {} }: { schools: School[]; reach?: Record<number, { min: number; max: number }> }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [query, setQuery] = useState("");
  const [activePhases, setActivePhases] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<School | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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
      // Confidence-gradient: reach washes UNDER the pins.
      // Three concentric bands — core (historically inside), mid, outer edge (volatile).
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
            "fill-color": "hsl(245, 70%, 55%)",
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
        paint: { "line-color": "hsl(245, 70%, 55%)", "line-opacity": 0.35, "line-width": 1.5, "line-dasharray": [2, 2] },
        layout: { visibility: "none" },
      });
      // Circle layer — colour by Ofsted grade via case expression
      // Using explicit nested "case" for cleaner TS typing than match with spread.
      map.addLayer({
        id: "schools-circle",
        type: "circle",
        source: "schools",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 13, 7, 16, 12],
          "circle-color": [
            "case",
            ["==", ["get", "ofsted"], "Outstanding"], "hsl(152,56%,34%)",
            ["==", ["get", "ofsted"], "Good"], "hsl(212,80%,42%)",
            ["==", ["get", "ofsted"], "Requires Improvement"], "hsl(38,92%,42%)",
            ["==", ["get", "ofsted"], "Inadequate"], "hsl(0,72%,45%)",
            "hsl(220,8%,55%)",
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
        if (s) setSelected(s);
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
        ofsted: s.ofsted ?? "Not judged",
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
    const map = mapRef.current;
    if (map) map.flyTo({ center: [s.lng, s.lat], zoom: 14, duration: 800 });
    setSelected(s);
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

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top glass panel: search + filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2">
          {/* Search */}
          <div className="relative">
            <div className="flex items-center rounded-lg border border-border bg-card/85 shadow-lg backdrop-blur-md">
              <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                onFocus={() => query.trim().length >= 2 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                placeholder="Search 236 schools by name or postcode"
                className="h-11 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search schools"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setSearchResults([]); setShowResults(false); }}
                  className="mr-2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "mr-1.5 flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  showFilters || activePhases.size > 0
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
                aria-label="Toggle filters"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activePhases.size > 0 && (
                  <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] tabular-nums">
                    {activePhases.size}
                  </span>
                )}
              </button>
            </div>
            {/* Search dropdown */}
            {showResults && searchResults.length > 0 && (
              <ul className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-lg border border-border bg-card shadow-xl backdrop-blur-md animate-slide-up">
                {searchResults.map((s) => (
                  <li key={s.urn}>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); flyToSchool(s); }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="block text-xs text-muted-foreground">{s.phase} · {s.postcode}</span>
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: ofstedHsl(s.ofsted) }}
                        title={ofstedLabel(s.ofsted)}
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Filter chips */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/85 p-2 shadow-lg backdrop-blur-md animate-slide-up">
              <span className="px-1 text-xs text-muted-foreground">Phase:</span>
              {PHASES.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePhase(p)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    activePhases.has(p)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {p}
                </button>
              ))}
              {activePhases.size > 0 && (
                <button
                  onClick={() => setActivePhases(new Set())}
                  className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              <button
                onClick={() => setShowReach((v) => !v)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  showReach
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : "border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950"
                )}
                title="Show published last-distance-offered as confidence washes (B&NES schools)"
              >
                Reach
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend — bottom-left glass panel */}
      <div className="pointer-events-none absolute bottom-6 left-3 z-10 sm:left-4">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/85 p-2.5 shadow-lg backdrop-blur-md">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Ofsted grade
          </p>
          <ul className="flex flex-col gap-1 text-xs">
            {[
              ["Outstanding", "hsl(var(--ofsted-outstanding))"],
              ["Good", "hsl(var(--ofsted-good))"],
              ["Requires Improvement", "hsl(var(--ofsted-requires))"],
              ["Inadequate", "hsl(var(--ofsted-inadequate))"],
              ["Not judged", "hsl(var(--ofsted-none))"],
            ].map(([label, color]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-foreground/80">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Result count — bottom-center */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:left-1/2">
        <div className="rounded-full border border-border bg-card/85 px-3 py-1 text-xs text-muted-foreground shadow-lg backdrop-blur-md tabular-nums">
          {filtered.length} of {schools.length} schools
        </div>
      </div>

      {/* Selected school popover */}
      {selected && (
        <div className="absolute inset-x-3 bottom-20 z-20 mx-auto max-w-sm sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl backdrop-blur-md animate-slide-up">
            <div className="flex items-start justify-between gap-2 border-b border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{selected.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.phase} · {selected.postcode} · {selected.la}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ofstedHsl(selected.ofsted) }}
                  aria-hidden
                />
                <span>{ofstedLabel(selected.ofsted)}</span>
                {selected.pupils != null && (
                  <span className="text-muted-foreground">· {selected.pupils} pupils</span>
                )}
              </div>
              <Link
                href={`/school/${selected.slug}`}
                className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                View school →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}