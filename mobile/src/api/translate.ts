const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

// MyMemory rejects "auto" as a source language (it returns an error string
// as the "translation"), so the source has to be detected locally. Script
// ranges pin down most languages; for Latin script we assume Uzbek unless
// the user is translating INTO Uzbek, where English is the likeliest source.
function detectSourceLanguage(text: string, target: string): string {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[가-힯]/.test(text)) return "ko";
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  if (/[Ѐ-ӿ]/.test(text)) return "ru";
  return target === "uz" ? "en" : "uz";
}

export async function translateText(text: string, from: string, to: string): Promise<string> {
  const source = from === "auto" ? detectSourceLanguage(text, to) : from;
  if (source === to) return text;

  const params = new URLSearchParams({ q: text, langpair: `${source}|${to}` });
  const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Tarjima xizmati javob bermadi");
  const data = await res.json();

  const translated = data.responseData?.translatedText;
  if (Number(data.responseStatus) !== 200 || !translated) {
    throw new Error("Tarjima qilib bo'lmadi");
  }
  return translated;
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
