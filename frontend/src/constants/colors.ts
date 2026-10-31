/**
 * Theme palette — amarillo, azul, rojo (vibrant).
 * Use `onSecondary` for text/icons on yellow (`secondary`) backgrounds.
 * Prefer the solid `*Soft` tints over `Colors.x + 'NN'` alpha hex: translucent
 * yellow over a tinted background blends into khaki and looks muddy.
 */
export const Colors = {
  // Palette reference (Ecuador-inspired, saturated)
  flagYellow: '#FFD400',
  flagBlue: '#0A72EF',
  flagRed: '#FF3B5C',

  // Primary — azul (acciones principales, enlaces). White text ≥ 4.5:1.
  primary: '#0A72EF',
  primaryDark: '#0057C2',
  primaryLight: '#4D9DFF',
  primarySoft: '#E6F0FF',

  // Secondary — amarillo (dinero, logros, acentos cálidos)
  secondary: '#FFD400',
  secondaryDark: '#E6B800',
  secondaryLight: '#FFE566',
  secondarySoft: '#FFF3C2',
  /** Texto/montos en amarillo sobre fondos claros (mejor contraste) */
  secondaryInk: '#8A6400',

  // Accent — rojo (alertas, rechazar, badges urgentes)
  accent: '#F0244A',
  accentDark: '#C8102E',
  accentLight: '#FF6B84',
  accentSoft: '#FFE8EC',

  /** Texto sobre fondos amarillos (WCAG-friendly) */
  onSecondary: '#1A2433',
  onSecondaryMuted: '#2F4158',

  success: '#00A884',
  successLight: '#55EFC4',

  warning: '#FF9F1A',
  warningLight: '#FFC857',

  error: '#F0244A',
  errorLight: '#FFA8B8',

  // Near-neutral so translucent tints and cards stay clean on top of it
  background: '#F5F7FB',
  backgroundAlt: '#FFF9E6',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F8FD',

  text: '#0B1220',
  textSecondary: '#3D4F66',
  textLight: '#64748B',

  border: '#E2E8F0',
  borderDark: '#CBD5E1',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(11, 18, 32, 0.48)',

  /** Neutral ink for shadows — colored glows read as blur, not depth */
  shadow: '#0F172A',

  gradientStart: '#0A72EF',
  gradientMiddle: '#FFD400',
  gradientEnd: '#FF3B5C',
};
