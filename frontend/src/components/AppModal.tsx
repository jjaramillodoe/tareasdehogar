import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Type } from '../theme';
import { shadow } from '../utils/shadow';
import Button from './ui/Button';
import IconTile from './ui/IconTile';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: 'primary' | 'secondary' | 'accent' | 'success';
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Bottom sheet (default) or centered card */
  variant?: 'sheet' | 'card';
  scrollable?: boolean;
  /** Larger max height for form-heavy modals */
  size?: 'md' | 'lg';
};

export default function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  icon = 'apps-outline',
  iconTone = 'primary',
  children,
  footer,
  variant = 'sheet',
  scrollable = true,
  size = 'md',
}: AppModalProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxHeight =
    variant === 'sheet'
      ? height * (size === 'lg' ? 0.92 : 0.86)
      : height * (size === 'lg' ? 0.85 : 0.78);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.root, variant === 'card' && styles.rootCentered]}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
          <View
            style={[
              styles.sheet,
              variant === 'card' ? styles.card : styles.sheetBottom,
              {
                maxHeight,
                paddingBottom: Math.max(insets.bottom, Spacing.md) + (footer ? 0 : Spacing.xs),
              },
            ]}
            accessibilityViewIsModal
          >
            {variant === 'sheet' ? <View style={styles.handle} /> : null}

            <View style={[styles.header, variant === 'card' && styles.headerCard]}>
              <IconTile icon={icon} tone={iconTone} size={44} />
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[Type.caption, styles.subtitle]} numberOfLines={3}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {scrollable ? (
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.bodyStatic}>{children}</View>
            )}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ActionTone = 'primary' | 'success' | 'danger' | 'secondary';

type AppModalActionsProps = {
  cancelLabel?: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirming?: boolean;
  confirmDisabled?: boolean;
  confirmTone?: ActionTone;
};

const CONFIRM_VARIANT = {
  primary: 'primary',
  success: 'success',
  danger: 'danger',
  secondary: 'kid',
} as const;

export function AppModalActions({
  cancelLabel = 'Cancelar',
  onCancel,
  confirmLabel,
  onConfirm,
  confirming = false,
  confirmDisabled = false,
  confirmTone = 'primary',
}: AppModalActionsProps) {
  return (
    <View style={styles.actions}>
      <Button
        label={cancelLabel}
        variant="secondary"
        fullWidth={false}
        style={styles.cancel}
        disabled={confirming}
        onPress={onCancel}
      />
      <Button
        label={confirmLabel}
        variant={CONFIRM_VARIANT[confirmTone]}
        fullWidth={false}
        style={styles.confirm}
        loading={confirming}
        disabled={confirmDisabled}
        onPress={onConfirm}
      />
    </View>
  );
}

/** Shared field styles for content inside AppModal */
export const modalFieldStyles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.md + 2,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  hint: {
    ...Type.caption,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md + 2,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  rootCentered: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...shadow({ color: Colors.shadow, offsetY: -4, blur: 24, opacity: 0.18, elevation: 18 }),
  },
  sheetBottom: {
    borderTopLeftRadius: Radius.xxl + 4,
    borderTopRightRadius: Radius.xxl + 4,
    width: '100%',
  },
  card: {
    borderRadius: Radius.xxl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    ...shadow({ color: Colors.shadow, offsetY: 10, blur: 28, opacity: 0.2, elevation: 16 }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderDark,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerCard: {
    paddingTop: Spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: Colors.border,
  },
  bodyScroll: {
    maxHeight: '100%',
  },
  bodyContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  bodyStatic: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderDark,
    backgroundColor: Colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    paddingBottom: Spacing.xs,
  },
  cancel: {
    flex: 1,
  },
  confirm: {
    flex: 1.35,
  },
});
