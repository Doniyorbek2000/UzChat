import { useThemeStore } from "../store/themeStore";
import { lightTheme, ThemeColors } from "./themes";

export type { ThemeColors };

export function useColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}

// Static fallback for non-component code (navigation options, etc.)
// Components should use useColors() for reactivity.
export const colors = lightTheme;
