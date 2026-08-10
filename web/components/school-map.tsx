"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import Fuse from "fuse.js";
import { Search, X, MapPin, CircleDashed, Info } from "lucide-react";
import type { School } from "@/lib/utils";
import { effectiveOfsted, ofstedHsl, ofstedLabel, PHASES, cn } from "@/lib/utils";
import { currentMapStyle, isDarkTheme, onThemeChange } from "@/lib/map-style";
import { SchoolSheet } from "@/components/school-sheet";

/**
 * Map-first home. MapLibre GL with OpenFreeMap tiles (no API key), theme-aware
 * basemap (liberty / dark). All ~22,000 schools as colour-coded circle pins.
 * Search (Fuse.js) floats as a glass pill; phase filters are an Airbnb-style
 * pill row beneath it. Tap a pin to open an AllTrails-style bottom sheet.
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
  const [showLegend, setShowLegend] = useState(false);
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showReach, setShowReach] = useState(false);
  // Bumped whenever the basemap style is swapped so data layers get rebuilt
  const [styleEpoch, setStyleEpoch] = useState(0);

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

  /** (Re)build all custom sources/layers on top of the current basemap. */
  const addLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || map.getSource("schools")) return;
    const dark = isDarkTheme();
    const brand = dark ? "hsl(160, 60%, 56%)" : "hsl(168, 66%, 30%)";
    const pinStroke = dark ? "rgba(8, 14, 15, 0.9)" : "#ffffff";
    const labelColor = dark ? "#e9efec" : "#20292c";
    const labelHalo = dark ? "rgba(10, 16, 17, 0.95)" : "#ffffff";

    map.addSource("schools", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    // Confidence-gradient: reach washes UNDER the pins (only meaningful where data exists).
    map.addSource("reach", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const bands: Array<[string, number]> = [
      ["reach-core", dark ? 0.20 : 0.14],
      ["reach-mid", dark ? 0.12 : 0.08],
      ["reach-outer", dark ? 0.06 : 0.04],
    ];
    for (const [id, opacity] of bands) {
      map.addLayer({
        id,
        type: "fill",
        source: "reach",
        filter: ["==", ["get", "band"], id],
        paint: {
          "fill-color": brand,
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
      paint: { "line-color": brand, "line-opacity": 0.45, "line-width": 1.5, "line-dasharray": [2, 2] },
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
        "circle-stroke-color": pinStroke,
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
        "text-color": labelColor,
        "text-halo-color": labelHalo,
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
          "fill-color": brand,
          "fill-opacity": dark ? 0.10 : 0.07,
        },
      },
      "schools-circle" // wash sits under the pins
    );
    map.addLayer({
      id: "selection-circle-line",
      type: "line",
      source: "selection-circle",
      paint: {
        "line-color": brand,
        "line-width": 2.5,
        "line-dasharray": [3, 2],
        "line-opacity": 0.9,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools]);

  // Initialise map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: currentMapStyle(),
      center: [-2.58, 51.42],
      zoom: 10.5,
      attributionControl: { compact: true },
      scrollZoom: true,
    });
    mapRef.current = map;
    map.on("load", () => {
      addLayers();
      updateSource();
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, addLayers]);

  // Swap basemap when the theme flips, then rebuild our data layers.
  useEffect(
    () =>
      onThemeChange(() => {
        const map = mapRef.current;
        if (!map) return;
        map.setStyle(currentMapStyle());
        const rebuild = () => {
          if (!map.isStyleLoaded()) {
            map.once("styledata", rebuild);
            return;
          }
          addLayers();
          setStyleEpoch((v) => v + 1);
        };
        map.once("styledata", rebuild);
      }),
    [addLayers]
  );

  useEffect(() => {
    updateSource();
  }, [updateSource, styleEpoch]);

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
  }, [selected, reach, styleEpoch]);

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
  }, [showReach, schools, reach, styleEpoch]);

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

  const pillBase =
    "press shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-xl transition-colors";
  const pillOff = "glass text-muted-foreground hover:text-foreground";
  const pillOn = "border-primary bg-primary text-primary-foreground shadow-card";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top chrome: search pill + filter pills. Right padding on mobile
          leaves room for the floating theme toggle. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 pr-14 pt-3.5 sm:p-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {/* Search — floating glass pill (Airbnb-grade) */}
          <div className="pointer-events-auto relative">
            <div className="glass flex h-[52px] items-center rounded-full transition-shadow focus-within:shadow-lift focus-within:ring-2 focus-within:ring-ring/40">
              <Search className="ml-5 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                onFocus={() => query.trim().length >= 2 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                placeholder={`Search ${schools.length.toLocaleString()} schools by name or postcode`}
                className="h-full w-full bg-transparent px-3 text-[15px] outline-none placeholder:text-muted-foreground/80"
                aria-label="Search schools"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setSearchResults([]); setShowResults(false); }}
                  className="press mr-2 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Search dropdown */}
            {showResults && searchResults.length > 0 && (
              <ul className="glass absolute inset-x-0 top-[60px] z-20 overflow-hidden rounded-2xl p-1.5 animate-slide-up">
                {searchResults.map((s, i) => {
                  const grade = effectiveOfsted(s);
                  return (
                    <li key={s.urn} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); flyToSchool(s); }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{s.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
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

          {/* Filter pills — always visible, horizontally scrollable */}
          <div className="pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActivePhases(new Set())}
              className={cn(pillBase, activePhases.size === 0 ? pillOn : pillOff)}
            >
              All phases
            </button>
            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => togglePhase(p)}
                className={cn(pillBase, activePhases.has(p) ? pillOn : pillOff)}
                aria-pressed={activePhases.has(p)}
              >
                {p}
              </button>
            ))}
            <span className="mx-0.5 h-8 w-px shrink-0 self-center bg-border/70" aria-hidden />
            <button
              onClick={() => setShowReach((v) => !v)}
              className={cn(pillBase, "inline-flex items-center gap-1.5", showReach ? pillOn : pillOff)}
              aria-pressed={showReach}
              title="Show published last-distance-offered as confidence washes (where data exists)"
            >
              <CircleDashed className="h-3.5 w-3.5" />
              Reach
            </button>
          </div>
        </div>
      </div>

      {/* Legend — compact info popover */}
      <div className="pointer-events-none absolute bottom-6 left-3 z-10 sm:left-4">
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setShowLegend((v) => !v)}
            className={cn(
              "press flex h-10 w-10 items-center justify-center rounded-full",
              showLegend ? "border border-primary bg-primary text-primary-foreground shadow-card" : "glass text-muted-foreground hover:text-foreground"
            )}
            aria-label="Ofsted legend"
            aria-expanded={showLegend}
          >
            <Info className="h-4 w-4" />
          </button>
          {showLegend && (
            <div className="glass absolute bottom-12 left-0 w-60 rounded-2xl p-4 animate-slide-up">
              <p className="eyebrow mb-3">Ofsted grade</p>
              <ul className="flex flex-col gap-2.5 text-xs">
                {legendItems.map(([label, color], i) => (
                  <li key={label} className="flex items-center gap-2.5 animate-rise" style={{ animationDelay: `${i * 35}ms` }}>
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ backgroundColor: color }} />
                    <span className="text-foreground/85">{label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border/60 pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
                Derived grades (post-2024) shown where no official headline exists.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Result count — bottom-center */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="glass rounded-full px-4 py-1.5 text-xs text-muted-foreground tabular-nums">
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
