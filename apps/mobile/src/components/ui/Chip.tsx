import { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, StyleProp, ViewStyle } from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type ChipProps = {
  children: ReactNode
  active?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function Chip({ children, active = false, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={active ? styles.textActive : styles.textInactive}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
  },
  textActive: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  textInactive: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.onSurface,
  },
})
