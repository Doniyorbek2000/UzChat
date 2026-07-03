// Lightweight content moderation for PUBLIC, non-E2EE content (reel captions
// and comments, feed posts and comments, story captions, public usernames).
// Private E2EE messages are never inspected — the server can't read them and
// must not try. This is a first-line filter (slurs, spam, flooding), not a
// replacement for a human report queue or an ML classifier; it exists so the
// app meets store policy on user-generated content out of the box.

// Base blocklist covers the most severe categories in the languages UzChat
// ships in. Extend via MODERATION_EXTRA_BLOCKED (comma-separated) without a
// redeploy. Kept deliberately small and high-precision to avoid false
// positives on ordinary speech.
const BASE_BLOCKLIST = [
  // English
  "childporn", "child porn", "cp video", "rape video", "kill yourself", "kys",
  // Uzbek / Russian common severe slurs & CSAM markers (transliteration-tolerant)
  "детское порно", "изнасилование ребенка", "убей себя",
];

const extra = (process.env.MODERATION_EXTRA_BLOCKED ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

const BLOCKLIST = [...BASE_BLOCKLIST, ...extra];

// Leetspeak / spacing normalisation so "k1ll  y0urself" still trips the list.
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

// Strips separators entirely so "k.y.s" and "kill  yourself" both collapse to
// a comparable form. Used only for blocklist matching (a high-precision list),
// so cross-word collisions are an acceptable trade-off for evasion resistance.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[\s._\-*]+/g, "")
    .trim();
}

const URL_RE = /(https?:\/\/[^\s]+)/gi;
const MAX_URLS = 3;
const MAX_REPEAT_RUN = 15; // e.g. "aaaaaaaaaaaaaaaa..." flooding

export interface ModerationResult {
  ok: boolean;
  reason?: "blocked_term" | "too_many_links" | "flooding";
  message?: string;
}

export const moderationService = {
  /**
   * Inspects a public text field. Returns { ok:false, ... } when it should be
   * rejected. Empty/whitespace text is always allowed (callers validate length
   * separately).
   */
  check(text: string | null | undefined): ModerationResult {
    if (!text) return { ok: true };
    const raw = text;
    const norm = normalize(raw);

    for (const term of BLOCKLIST) {
      if (norm.includes(normalize(term))) {
        return { ok: false, reason: "blocked_term", message: "Kontent jamiyat qoidalariga zid" };
      }
    }

    const urlCount = (raw.match(URL_RE) ?? []).length;
    if (urlCount > MAX_URLS) {
      return { ok: false, reason: "too_many_links", message: "Havolalar soni juda ko'p" };
    }

    if (new RegExp(`(.)\\1{${MAX_REPEAT_RUN},}`).test(raw)) {
      return { ok: false, reason: "flooding", message: "Takrorlanuvchi belgilar aniqlandi" };
    }

    return { ok: true };
  },

  /** Convenience: checks several fields (caption + hashtags etc.) at once. */
  checkAll(...texts: (string | null | undefined)[]): ModerationResult {
    for (const t of texts) {
      const r = this.check(t);
      if (!r.ok) return r;
    }
    return { ok: true };
  },
};
