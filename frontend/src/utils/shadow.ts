import { ViewStyle } from 'react-native';

type ShadowParams = {
  /** Hex color like `#1A8CFF` or `#000` */
  color?: string;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  opacity?: number;
  /** Android elevation fallback */
  elevation?: number;
};

function toRgba(color: string, opacity: number): string {
  const raw = color.trim();
  if (raw.startsWith('rgba(') || raw.startsWith('rgb(')) {
    return raw;
  }
  const hex = raw.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (full.length !== 6) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Cross-platform shadow using `boxShadow` (replaces deprecated shadow* props).
 * Keeps `elevation` for older Android.
 */
export function shadow({
  color = '#000000',
  offsetX = 0,
  offsetY = 4,
  blur = 8,
  opacity = 0.15,
  elevation = 4,
}: ShadowParams = {}): ViewStyle {
  return {
    boxShadow: [
      {
        offsetX,
        offsetY,
        blurRadius: blur,
        color: toRgba(color, opacity),
      },
    ],
    elevation,
  };
}
