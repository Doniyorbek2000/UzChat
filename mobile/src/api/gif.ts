const TENOR_API_KEY = "AIzaSyDDAMwpS7NxG0HC62GwS2M1CrfjT7S0GVk";
const TENOR_BASE = "https://tenor.googleapis.com/v2";

export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

function mapResults(results: any[]): GifResult[] {
  return results.map((r) => {
    const gif = r.media_formats?.gif ?? r.media_formats?.mediumgif;
    const preview = r.media_formats?.tinygif ?? r.media_formats?.nanogif ?? gif;
    return {
      id: r.id,
      title: r.title ?? "",
      url: gif?.url ?? "",
      previewUrl: preview?.url ?? "",
      width: gif?.dims?.[0] ?? 220,
      height: gif?.dims?.[1] ?? 220,
    };
  });
}

export async function searchGifs(query: string, limit = 20): Promise<GifResult[]> {
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    q: query,
    limit: String(limit),
    media_filter: "gif,tinygif",
    locale: "uz_UZ",
  });
  const res = await fetch(`${TENOR_BASE}/search?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return mapResults(data.results ?? []);
}

export async function getTrendingGifs(limit = 20): Promise<GifResult[]> {
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    limit: String(limit),
    media_filter: "gif,tinygif",
    locale: "uz_UZ",
  });
  const res = await fetch(`${TENOR_BASE}/featured?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return mapResults(data.results ?? []);
}
