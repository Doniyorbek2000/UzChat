/** Maps a User-Agent header to a human-readable device label for security notifications. */
export function formatDeviceName(userAgent: string | null | undefined): string {
  if (!userAgent) return "noma'lum qurilma";
  if (/android|dalvik/i.test(userAgent)) return "Android qurilma";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/iphone|ios/i.test(userAgent)) return "iPhone";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return "noma'lum qurilma";
}
