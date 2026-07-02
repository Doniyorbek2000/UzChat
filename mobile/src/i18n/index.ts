import { create } from "zustand";
import { I18nManager } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { DICTIONARIES, SUPPORTED_LOCALES, TranslationKey, uz } from "./translations";
import { STRING_DICTIONARIES } from "./strings";

export { SUPPORTED_LOCALES };
export type { TranslationKey };

// App-wide localization: 23 locales with Uzbek (Latin) as the base/fallback.
// Components call useT() for a reactive translator; non-component code can
// use the plain t() which reads the current store state.

const LOCALE_FILE = `${FileSystem.documentDirectory}locale.json`;

function detectDeviceLocale(): string {
  try {
    const device = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    const lang = device.split("-")[0].toLowerCase();
    if (DICTIONARIES[device]) return device;
    if (DICTIONARIES[lang]) return lang;
  } catch {}
  return "uz";
}

interface I18nState {
  locale: string;
  isRtl: boolean;
  bootstrap: () => Promise<void>;
  setLocale: (locale: string) => Promise<void>;
}

function rtlFor(locale: string): boolean {
  return SUPPORTED_LOCALES.find((l) => l.code === locale)?.rtl === true;
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: "uz",
  isRtl: false,

  bootstrap: async () => {
    try {
      const info = await FileSystem.getInfoAsync(LOCALE_FILE);
      if (info.exists) {
        const saved = JSON.parse(await FileSystem.readAsStringAsync(LOCALE_FILE)) as { locale?: string };
        if (saved.locale && DICTIONARIES[saved.locale]) {
          set({ locale: saved.locale, isRtl: rtlFor(saved.locale) });
          return;
        }
      }
    } catch {}
    const detected = detectDeviceLocale();
    set({ locale: detected, isRtl: rtlFor(detected) });
  },

  setLocale: async (locale) => {
    if (!DICTIONARIES[locale]) return;
    const rtl = rtlFor(locale);
    set({ locale, isRtl: rtl });
    try {
      await FileSystem.writeAsStringAsync(LOCALE_FILE, JSON.stringify({ locale }));
    } catch {}
    // Arabic/Persian/Urdu need a right-to-left layout. RN applies the flip on
    // the next app start; the language screen tells the user to restart.
    try {
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
      }
    } catch {}
  },
}));

/** Non-reactive translate — for navigation options, utils, alerts. */
export function t(key: TranslationKey): string {
  const { locale } = useI18nStore.getState();
  return DICTIONARIES[locale]?.[key] ?? uz[key];
}

/** Reactive translate hook — re-renders the component when the locale changes. */
export function useT(): (key: TranslationKey) => string {
  const locale = useI18nStore((s) => s.locale);
  return (key) => DICTIONARIES[locale]?.[key] ?? uz[key];
}

/**
 * Gettext-style translate: the key IS the Uzbek source string, so every
 * screen can be wrapped mechanically; untranslated strings simply render the
 * Uzbek original. Non-reactive by design — RootNavigator remounts the whole
 * tree when the locale changes, so every tr() re-evaluates instantly.
 */
export function tr(source: string): string {
  const { locale } = useI18nStore.getState();
  if (locale === "uz") return source;
  return STRING_DICTIONARIES[locale]?.[source] ?? source;
}
