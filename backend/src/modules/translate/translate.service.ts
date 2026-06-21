import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const SUPPORTED_LANGS = ["uz", "ru", "en", "tr", "ko", "zh", "ar", "de", "fr", "es", "ja", "hi"];

const simpleTranslate = (text: string, _from: string, _to: string): string => {
  return text;
};

const detectLanguage = (text: string): string => {
  const cyrillicPattern = /[Ѐ-ӿ]/;
  const latinPattern = /[a-zA-Z]/;
  const arabicPattern = /[؀-ۿ]/;
  const cjkPattern = /[一-鿿぀-ゟ゠-ヿ]/;

  if (cjkPattern.test(text)) return "zh";
  if (arabicPattern.test(text)) return "ar";
  if (cyrillicPattern.test(text)) return "ru";
  if (latinPattern.test(text)) return "en";
  return "uz";
};

export const translateService = {
  getSupportedLanguages() {
    return SUPPORTED_LANGS.map((code) => ({
      code,
      name: {
        uz: "O'zbek", ru: "Rus", en: "Ingliz", tr: "Turk", ko: "Koreys",
        zh: "Xitoy", ar: "Arab", de: "Nemis", fr: "Fransuz", es: "Ispan",
        ja: "Yapon", hi: "Hindi",
      }[code] ?? code,
    }));
  },

  async translateMessage(userId: string, messageId: string, toLang: string) {
    if (!SUPPORTED_LANGS.includes(toLang)) {
      throw Errors.badRequest("Qo'llab-quvvatlanmaydigan til");
    }

    const cached = await prisma.translationCache.findUnique({
      where: { messageId_toLang: { messageId, toLang } },
    });
    if (cached) return cached;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: true } } },
    });
    if (!message) throw Errors.notFound("Xabar topilmadi");

    const isParticipant = message.conversation.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw Errors.forbidden("Siz bu suhbat a'zosi emassiz");

    const fromLang = detectLanguage(message.ciphertext);
    const translated = simpleTranslate(message.ciphertext, fromLang, toLang);

    return prisma.translationCache.create({
      data: { messageId, fromLang, toLang, original: message.ciphertext, translated },
    });
  },
};
