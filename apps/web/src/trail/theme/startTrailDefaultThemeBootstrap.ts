import { refreshTheme } from "~/hooks/useTheme";
import {
  THEME_APPEARANCE_MODE_STORAGE_KEY,
  THEME_HALVES_STORAGE_KEY,
} from "~/themePalette";

const STORAGE_KEY = "t3code:theme";
const TRAIL_DEFAULT_BOOTSTRAP_KEY = "t3code:trail-default-theme:v1";
const TRAIL_THEME_ID = "trail";

/** One-time bootstrap so stock (no halves) installs default to the Trail palette. */
export function startTrailDefaultThemeBootstrap(): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    if (window.localStorage.getItem(TRAIL_DEFAULT_BOOTSTRAP_KEY) !== null) return () => {};
    const theme = window.localStorage.getItem(STORAGE_KEY);
    const halves = window.localStorage.getItem(THEME_HALVES_STORAGE_KEY);
    const appearanceMode = window.localStorage.getItem(THEME_APPEARANCE_MODE_STORAGE_KEY);
    const usesStockPalette =
      halves === null && (theme === null || theme === "system") && appearanceMode === null;
    if (usesStockPalette) {
      window.localStorage.setItem(
        THEME_HALVES_STORAGE_KEY,
        JSON.stringify({ light: TRAIL_THEME_ID, dark: TRAIL_THEME_ID }),
      );
      refreshTheme();
    }
    window.localStorage.setItem(TRAIL_DEFAULT_BOOTSTRAP_KEY, "1");
  } catch {
    /* storage unavailable */
  }
  return () => {};
}