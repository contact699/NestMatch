import { ReactNode } from 'react'
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type Variant = 'success' | 'info' | 'warning' | 'neutral' | 'error'

type BadgeProps = {
  children: ReactNode
  variant?: Variant
  style?: StyleProp<ViewStyle>
}

const PALETTE: Record<Variant, { bg: string; fg: string }> = {
  success: { bg: colors.successContainer, fg: colors.onSuccessContainer },
  info: { bg: colors.primaryFixed, fg: colors.primary },
  warning: { bg: colors.warningContainer, fg: colors.onWarningContainer },
  neutral: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant },
  error: { bg: colors.errorContainer, fg: colors.error },
}

export function Badge({ children, variant = 'neutral', style }: BadgeProps) {
  const { bg, fg } = PALETTE[variant]
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
})
