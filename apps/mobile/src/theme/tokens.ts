// Design tokens sourced from apps/web/src/app/globals.css.
// Single source of truth for colors, spacing, radii, shadows, typography.

export const colors = {
  primary: '#002045',
  onPrimary: '#ffffff',
  primaryContainer: '#1a365d',
  onPrimaryContainer: '#86a0cd',
  primaryFixed: '#d6e3ff',
  primaryFixedDim: '#adc7f7',

  secondary: '#006a60',
  onSecondary: '#ffffff',
  secondaryContainer: '#8cf5e4',
  onSecondaryContainer: '#007166',
  secondaryFixed: '#b0f0e4',

  tertiary: '#371800',
  tertiaryContainer: '#562a00',
  tertiaryFixed: '#ffdcc4',

  background: '#f8f9fa',
  surface: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  surfaceVariant: '#e1e3e4',

  onSurface: '#191c1d',
  onSurfaceVariant: '#43474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',

  successContainer: '#8cf5e4',
  onSuccessContainer: '#006a60',
  warningContainer: '#ffdcc4',
  onWarningContainer: '#562a00',
} as const

export type ColorToken = keyof typeof colors

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const

export const shadows = {
  sm: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
} as const

export const typography = {
  fontFamily: {
    display: 'Manrope_700Bold',
    displayMedium: 'Manrope_600SemiBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodyBold: 'Inter_600SemiBold',
  },
  size: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 34,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
} as const
