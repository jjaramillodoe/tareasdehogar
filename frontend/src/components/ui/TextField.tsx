import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Type } from '../../theme';

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  hint?: string;
  /** Adds a show/hide toggle and starts with the value hidden. */
  secureToggle?: boolean;
  /** Large, letter-spaced text for codes and PINs. */
  code?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Labeled input with icon, focus ring, inline error and optional show/hide toggle. */
const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, icon, error, hint, secureToggle, code, containerStyle, onFocus, onBlur, style, ...input },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
        {icon ? (
          <Ionicons name={icon} size={20} color={focused ? Colors.primary : Colors.textSecondary} />
        ) : null}
        <TextInput
          ref={ref}
          style={[styles.input, code && styles.inputCode, style]}
          placeholderTextColor={Colors.textLight}
          accessibilityLabel={label}
          secureTextEntry={secureToggle ? hidden : input.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...input}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar' : 'Ocultar'}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 54,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  fieldFocused: {
    borderColor: Colors.primary,
    boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 3, color: Colors.primarySoft }],
  },
  fieldError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  inputCode: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs + 2,
  },
  error: {
    ...Type.caption,
    flex: 1,
    color: Colors.error,
    fontWeight: '600',
  },
  hint: {
    ...Type.caption,
    marginTop: Spacing.xs + 2,
  },
});
