import { colors } from "./colors";

export interface ChatWallpaper {
  id: string;
  name: string;
  color: string;
}

// Reserved key in the wallpaper map for the app-wide default (applies to chats with no override).
export const DEFAULT_WALLPAPER_KEY = "default";

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  { id: "standard", name: "Standart", color: colors.background },
  { id: "green", name: "Yashil", color: "#C9E8B5" },
  { id: "blue", name: "Moviy", color: "#BBDEFB" },
  { id: "lavender", name: "Lavanda", color: "#D1C4E9" },
  { id: "pink", name: "Pushti", color: "#F8BBD0" },
  { id: "yellow", name: "Sariq", color: "#FFF59D" },
  { id: "dark", name: "To'q kulrang", color: "#2C2C2C" },
  { id: "black", name: "Qora", color: "#000000" },
];

export function getWallpaperColor(wallpaperId: string | undefined): string {
  return CHAT_WALLPAPERS.find((w) => w.id === wallpaperId)?.color ?? colors.background;
}

// A custom wallpaper (picked from the gallery) is stored as "custom:<local file uri>".
const CUSTOM_WALLPAPER_PREFIX = "custom:";

export function getCustomWallpaperUri(wallpaperId: string | undefined): string | null {
  if (!wallpaperId || !wallpaperId.startsWith(CUSTOM_WALLPAPER_PREFIX)) return null;
  return wallpaperId.slice(CUSTOM_WALLPAPER_PREFIX.length);
}

export function makeCustomWallpaperId(uri: string): string {
  return `${CUSTOM_WALLPAPER_PREFIX}${uri}`;
}
