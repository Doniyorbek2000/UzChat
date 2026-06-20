const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export async function translateText(text: string, from: string, to: string): Promise<string> {
  const params = new URLSearchParams({ q: text, langpair: `${from}|${to}` });
  const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Tarjima xizmati javob bermadi");
  const data = await res.json();
  return data.responseData?.translatedText ?? text;
}

export const LANGUAGES = [
  { code: "uz", label: "O'zbekcha" },
  { code: "ru", label: "Ruscha" },
  { code: "en", label: "Inglizcha" },
  { code: "tr", label: "Turkcha" },
  { code: "ar", label: "Arabcha" },
  { code: "zh", label: "Xitoycha" },
  { code: "ko", label: "Koreyscha" },
  { code: "ja", label: "Yaponcha" },
  { code: "de", label: "Nemischa" },
  { code: "fr", label: "Fransuzcha" },
  { code: "es", label: "Ispancha" },
  { code: "hi", label: "Hindcha" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
