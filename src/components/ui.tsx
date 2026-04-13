import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/theme';

// ─────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.btn,
    styles[`btn_${variant}`],
    styles[`btn_${size}`],
    isDisabled && styles.btn_disabled,
    style,
  ];

  const textStyle = [
    styles.btnText,
    styles[`btnText_${variant}`],
    styles[`btnText_${size}`],
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.forest[700]} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon && <View style={styles.btnIcon}>{icon}</View>}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style as TextStyle]}
        placeholderTextColor={Colors.stone[400]}
        {...props}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

// ─────────────────────────────────────────
// CARD
// ─────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: 'green' | 'orange' | 'red' | 'blue' | 'gray';
}

export function Badge({ label, color = 'green' }: BadgeProps) {
  const colorMap = {
    green: { bg: Colors.forest[100], text: Colors.forest[700] },
    orange: { bg: Colors.warningLight, text: Colors.warning },
    red: { bg: Colors.dangerLight, text: Colors.danger },
    blue: { bg: Colors.waterLight, text: Colors.water },
    gray: { bg: Colors.stone[200], text: Colors.stone[600] },
  };
  const c = colorMap[color];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
export function EmptyState({
  emoji, title, subtitle, action,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  btn: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn_primary: {
    backgroundColor: Colors.forest[600],
    ...Shadows.sm,
  },
  btn_secondary: {
    backgroundColor: Colors.forest[100],
    borderWidth: 1,
    borderColor: Colors.forest[200],
  },
  btn_ghost: {
    backgroundColor: Colors.transparent,
  },
  btn_danger: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btn_sm: { paddingVertical: 8, paddingHorizontal: 14 },
  btn_md: { paddingVertical: 14, paddingHorizontal: 20 },
  btn_lg: { paddingVertical: 18, paddingHorizontal: 28 },
  btn_disabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnIcon: {},
  btnText: { fontWeight: '600' },
  btnText_primary: { color: Colors.white },
  btnText_secondary: { color: Colors.forest[700] },
  btnText_ghost: { color: Colors.forest[600] },
  btnText_danger: { color: Colors.danger },
  btnText_sm: { fontSize: Typography.sizes.sm },
  btnText_md: { fontSize: Typography.sizes.base },
  btnText_lg: { fontSize: Typography.sizes.md },

  // Input
  inputContainer: { gap: 6 },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    color: Colors.stone[700],
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.stone[200],
    borderRadius: Radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: Typography.sizes.base,
    color: Colors.stone[900],
  },
  inputError: { borderColor: Colors.danger },
  inputErrorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.danger,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.forest[900],
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.base },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.stone[800],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.stone[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: { marginTop: Spacing.lg },
});
