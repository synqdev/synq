import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'iso';
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  disabled,
  variant = 'iso', // Default to iso for new slick look
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : variant === 'iso' ? styles.iso : styles.outline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={
          variant === 'primary'
            ? styles.primaryText
            : variant === 'iso'
              ? styles.isoText
              : styles.outlineText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 0, // Reset padding as we use fixed height
    height: 57, // Fixed 57px height
    borderRadius: theme.radius.lg, // rounded-xl matches lg in theme
    alignItems: 'center',
    justifyContent: 'center', // Center text vertically
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: theme.colors.primary[500],
  },
  iso: {
    backgroundColor: theme.colors.secondary[900], // Black bg
    borderWidth: 2,
    borderColor: theme.colors.secondary[900],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outline: {
    backgroundColor: theme.colors.white,
    borderWidth: 2, // Thicker border for slick look
    borderColor: theme.colors.secondary[900], // Black border
  },
  primaryText: {
    color: theme.colors.white,
    fontSize: 18, // Larger text
    fontWeight: '600',
  },
  isoText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  outlineText: {
    color: theme.colors.secondary[900],
    fontSize: 18,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }], // Press effect
  },
});
