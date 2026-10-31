import { TextStyle, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { shadow } from '../utils/shadow';

export { Colors };

/** 4pt spacing scale. Use these instead of ad-hoc margins/paddings. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

/**
 * Type scale. Font family is left to the platform default for now; set
 * `fontFamily` here once a custom font is loaded and every screen picks it up.
 */
export const Type = {
  display: { fontSize: 36, lineHeight: 42, fontWeight: '900', letterSpacing: -1, color: Colors.text },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4, color: Colors.text },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: Colors.text },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: Colors.textSecondary },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: Colors.text },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: Colors.textSecondary },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
} satisfies Record<string, TextStyle>;

/** Elevation levels with neutral, tight shadows (colored glows look blurry). */
export const Elevation = {
  none: {},
  low: shadow({ color: Colors.shadow, offsetY: 1, blur: 3, opacity: 0.08, elevation: 1 }),
  card: shadow({ color: Colors.shadow, offsetY: 4, blur: 12, opacity: 0.08, elevation: 3 }),
  raised: shadow({ color: Colors.shadow, offsetY: 6, blur: 16, opacity: 0.14, elevation: 8 }),
} satisfies Record<string, ViewStyle>;

/** Solid tints for chips, icon tiles and badges. */
export const Tones = {
  primary: { fg: Colors.primary, bg: Colors.primarySoft },
  secondary: { fg: Colors.secondaryInk, bg: Colors.secondarySoft },
  accent: { fg: Colors.accent, bg: Colors.accentSoft },
  success: { fg: '#00795F', bg: '#E0F7F1' },
  warning: { fg: '#9A4A00', bg: '#FFF1DE' },
  neutral: { fg: Colors.textSecondary, bg: '#EEF2F7' },
} as const;

export type Tone = keyof typeof Tones;
