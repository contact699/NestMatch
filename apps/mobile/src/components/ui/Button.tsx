import { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = {
  children: ReactNode
  onPress?: () => void
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const VARIANT: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: 'transparent', fg: colors.error, border: colors.error },
}

const SIZE: Record<Size, { py: number; px: number; fs: number }> = {
  sm: { py: 8, px: 14, fs: 13 },
  md: { py: 12, px: 18, fs: 15 },
  lg: { py: 14, px: 22, fs: 16 },
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const v = VARIANT[variant]
  const s = SIZE[size]
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1.5 : 0,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <>
            {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
            <Text style={[styles.label, { color: v.fg, fontSize: s.fs }]}>
              {children}
            </Text>
            {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
          </>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: typography.fontFamily.bodyBold },
})
