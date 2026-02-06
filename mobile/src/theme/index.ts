import { colors } from './colors';

export const theme = {
  colors,
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  text: {
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.secondary[900],
    },
    h2: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.secondary[900],
    },
    body: {
      fontSize: 16,
      color: colors.secondary[700],
    },
    caption: {
      fontSize: 14,
      color: colors.secondary[600],
    },
  },
};
