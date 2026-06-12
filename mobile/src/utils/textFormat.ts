// WhatsApp/Telegram-style inline formatting: *bold*, _italic_, ~strikethrough~, `code`, ||spoiler||.
// Each marker must hug non-space content so things like "5 * 3" are left alone.
export const FORMAT_PATTERN =
  /(\*(?:[^\s*](?:[^*\n]*[^\s*])?)\*|_(?:[^\s_](?:[^_\n]*[^\s_])?)_|~(?:[^\s~](?:[^~\n]*[^\s~])?)~|`(?:[^\s`](?:[^`\n]*[^\s`])?)`|\|\|(?:[^\s|](?:[^|\n]*[^\s|])?)\|\|)/g;

// Strips formatting markers, leaving the underlying text - used for previews (chat list,
// replies, pinned messages) where raw markdown syntax shouldn't be shown.
export function stripFormatting(text: string): string {
  return text.replace(FORMAT_PATTERN, (match) => (match.startsWith("||") ? match.slice(2, -2) : match.slice(1, -1)));
}
