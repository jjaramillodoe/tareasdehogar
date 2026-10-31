import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Elevation, Radius, Spacing, Type } from '../../theme';
import { hapticTap } from '../../utils/feedback';
import { shadow } from '../../utils/shadow';

type Variant = 'primary' | 'secondary' | 'kid' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string; elevation: ViewStyle }> = {
  primary: {
    bg: Colors.primary,
    fg: Colors.white,
    elevation: shadow({ color: Colors.primaryDark, offsetY: 3, blur: 6, opacity: 0.28, elevation: 2 }),
  },
  secondary: { bg: Colors.surface, fg: Colors.primary, border: Colors.borderDark, elevation: Elevation.low },
  kid: { bg: Colors.secondary, fg: Colors.onSecondary, elevation: Elevation.low },
  ghost: { bg: 'transparent', fg: Colors.primary, elevation: Elevation.none },
  danger: { bg: Colors.accentDark, fg: Colors.white, elevation: Elevation.low },
  /** Darker than Colors.success so white text stays ≥ 4.5:1. */
  success: { bg: '#00875F', fg: Colors.white, elevation: Elevation.low },
};

const SIZES: Record<Size, { height: number; icon: number; fontSize: number }> = {
  sm: { height: 40, icon: 16, fontSize: 14 },
  md: { height: 48, icon: 18, fontSize: 15 },
  lg: { height: 56, icon: 20, fontSize: 17 },
};

/** App button: solid colors, press-to-shrink feedback and a haptic tap. */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = true,
  style,
  accessibilityHint,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;

  const animateTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const handlePress = () => {
    if (haptic) void hapticTap();
    onPress();
  };

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          { height: s.height, backgroundColor: v.bg },
          size === 'sm' && styles.small,
          v.border && { borderWidth: 1.5, borderColor: v.border },
          !inactive && v.elevation,
          pressed && variant === 'ghost' && styles.ghostPressed,
          inactive && styles.inactive,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={s.icon} color={v.fg} /> : null}
            <Text style={[Type.button, { color: v.fg, fontSize: s.fontSize }]} numberOfLines={1}>
              {label}
            </Text>
            {iconRight ? <Ionicons name={iconRight} size={s.icon} color={v.fg} /> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  small: {
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  ghostPressed: {
    backgroundColor: Colors.primarySoft,
  },
  inactive: {
    opacity: 0.5,
  },
});
