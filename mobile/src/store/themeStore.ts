import { create } from "zustand";
import * as FileSystem from "expo-file-system/legacy";
import { Appearance } from "react-native";
import { lightTheme, darkTheme, ThemeColors } from "../theme/themes";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  bootstrap: () => void;
}

function resolveColors(mode: ThemeMode): { colors: ThemeColors; isDark: boolean } {
  if (mode === "dark") return { colors: darkTheme, isDark: true };
  if (mode === "light") return { colors: lightTheme, isDark: false };
  const systemDark = Appearance.getColorScheme() === "dark";
  return { colors: systemDark ? darkTheme : lightTheme, isDark: systemDark };
}

const THEME_FILE = `${FileSystem.documentDirectory}theme.json`;

async function saveMode(mode: ThemeMode) {
  await FileSystem.writeAsStringAsync(THEME_FILE, JSON.stringify({ mode })).catch(() => {});
}

async function loadMode(): Promise<ThemeMode> {
  try {
    const info = await FileSystem.getInfoAsync(THEME_FILE);
    if (!info.exists) return "system";
    const content = await FileSystem.readAsStringAsync(THEME_FILE);
    const { mode } = JSON.parse(content) as { mode: ThemeMode };
    return mode ?? "system";
  } catch {
    return "system";
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "system",
  ...resolveColors("system"),

  setMode: (mode) => {
    set({ mode, ...resolveColors(mode) });
    saveMode(mode);
  },

  bootstrap: () => {
    loadMode().then((mode) => set({ mode, ...resolveColors(mode) }));

    Appearance.addChangeListener(() => {
      if (get().mode === "system") {
        set(resolveColors("system"));
      }
    });
  },
}));
