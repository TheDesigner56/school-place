/**
 * Map basemap styles (OpenFreeMap — no API key) and theme synchronisation.
 * Liberty for light, OpenFreeMap dark for dark mode. Both map components
 * re-apply their data layers after a style swap.
 */
export const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
export const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

export function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function currentMapStyle(): string {
  return isDarkTheme() ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}

/** Subscribe to html.dark class flips (theme toggle + init script). Returns unsubscribe. */
export function onThemeChange(cb: (dark: boolean) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(() => cb(isDarkTheme()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
