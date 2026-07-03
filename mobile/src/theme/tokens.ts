// Centralised design tokens. Colors stay in themes.ts (they're theme-aware);
// everything else — spacing, radii, typography, shadows — lives here so the
// whole app scales from one consistent system instead of magic numbers
// scattered across every StyleSheet. New screens should reference these.

// 4-pt spacing scale.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Corner radii.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// Type scale (size + sensible line height + weight).
export const typography = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: "500" as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: "400" as const },
} as const;

// Standard elevation presets (cross-platform: iOS shadow + Android elevation).
export const shadow = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// Common touch-target minimums (accessibility: 44pt is Apple's guideline).
export const hitSize = {
  minTouch: 44,
  icon: 24,
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 88,
} as const;

// Standard timings for animations, so motion feels consistent.
export const duration = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;
