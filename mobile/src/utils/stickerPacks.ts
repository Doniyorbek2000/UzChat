// Curated "sticker" packs: each entry is 1-3 emoji that render large via the
// existing isEmojiOnlyMessage rule in ChatRoomScreen, giving a WeChat/Telegram-style
// quick-access sticker picker without requiring custom artwork or new dependencies.
export interface StickerPack {
  id: string;
  name: string;
  stickers: string[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "greetings",
    name: "Salomlashish",
    stickers: ["👋", "🤗", "😊", "🙌", "🤝", "👋😊", "🤗💕", "🙏"],
  },
  {
    id: "love",
    name: "Sevgi",
    stickers: ["❤️", "😍", "🥰", "😘", "💕", "💖", "😻", "💘"],
  },
  {
    id: "emotions",
    name: "His-tuyg'ular",
    stickers: ["😂", "🤣", "😭", "😡", "😱", "😴", "🙄", "😅"],
  },
  {
    id: "celebration",
    name: "Tabriklash",
    stickers: ["🎉", "🎂", "🥳", "🎁", "👏", "🎊", "🥳🎉", "🎉🎊"],
  },
  {
    id: "gestures",
    name: "Imo-ishoralar",
    stickers: ["👍", "👎", "✌️", "🙏", "👌", "💪", "🤞", "🤙"],
  },
  {
    id: "animals",
    name: "Hayvonlar",
    stickers: ["🐶", "🐱", "🐼", "🦁", "🐻", "🐰", "🐸", "🦄"],
  },
  {
    id: "food",
    name: "Ovqat",
    stickers: ["🍕", "🍔", "🍰", "☕", "🍎", "🍩", "🍦", "🍓"],
  },
  {
    id: "nature",
    name: "Tabiat",
    stickers: ["🌸", "☀️", "🌈", "⭐", "🌙", "🔥", "❄️", "🌊"],
  },
];
