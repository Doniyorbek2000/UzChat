const URL_PATTERN = /https?:\/\/[^\s<>"]+/i;
const TRAILING_PUNCTUATION = /[.,!?;:'")\]}]+$/;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_PATTERN);
  if (!match) return null;
  return match[0].replace(TRAILING_PUNCTUATION, "");
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|[a-zA-Z]+);/g, (full, entity) => {
    if (entity[0] === "#") {
      const code = Number(entity.slice(1));
      return Number.isFinite(code) ? String.fromCharCode(code) : full;
    }
    return ENTITY_MAP[entity] ?? full;
  });
}

function resolveUrl(maybeRelative: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  const originMatch = baseUrl.match(/^(https?:\/\/[^/]+)/i);
  const origin = originMatch ? originMatch[1] : baseUrl;
  if (maybeRelative.startsWith("//")) return `https:${maybeRelative}`;
  if (maybeRelative.startsWith("/")) return `${origin}${maybeRelative}`;
  return `${origin}/${maybeRelative}`;
}

function getMetaContent(html: string, names: string[]): string | undefined {
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const nameMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (!nameMatch || !contentMatch) continue;
    if (names.includes(nameMatch[1].toLowerCase())) {
      return decodeHtmlEntities(contentMatch[1]).trim();
    }
  }
  return undefined;
}

export function parseLinkPreview(html: string, url: string): LinkPreviewData | null {
  const title = getMetaContent(html, ["og:title", "twitter:title"]) ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const description = getMetaContent(html, ["og:description", "twitter:description", "description"]);
  const image = getMetaContent(html, ["og:image", "twitter:image"]);
  const siteName = getMetaContent(html, ["og:site_name"]);

  if (!title && !description && !image) return null;

  return {
    url,
    title: title ? decodeHtmlEntities(title).trim() : undefined,
    description,
    imageUrl: image ? resolveUrl(image, url) : undefined,
    siteName,
  };
}

const previewCache = new Map<string, Promise<LinkPreviewData | null>>();
const FETCH_TIMEOUT_MS = 8000;

async function fetchLinkPreviewUncached(url: string): Promise<LinkPreviewData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("text/html")) return null;
    const html = await res.text();
    return parseLinkPreview(html, res.url || url);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  let cached = previewCache.get(url);
  if (!cached) {
    cached = fetchLinkPreviewUncached(url);
    previewCache.set(url, cached);
  }
  return cached;
}
