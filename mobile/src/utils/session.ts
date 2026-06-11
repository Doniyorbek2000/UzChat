export function formatSessionDevice(userAgent: string | null): string {
  if (!userAgent) return "Noma'lum qurilma";
  if (/android|dalvik/i.test(userAgent)) return "Android qurilma";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/iphone|ios/i.test(userAgent)) return "iPhone";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return userAgent.length > 40 ? `${userAgent.slice(0, 40)}...` : userAgent;
}
