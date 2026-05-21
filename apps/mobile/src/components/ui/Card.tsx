import { ReactNode } from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import { colors, radii, shadows } from '@/theme/tokens'

type CardProps = {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  variant?: 'surface' | 'primary'
}

export function Card({ children, onPress, style, variant = 'surface' }: CardProps) {
  const bg = variant === 'primary' ? colors.primary : colors.surfaceContainerLowest
  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: variant === 'primary' ? colors.primary : colors.outlineVariant,
        },
        shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  )
  if (onPress) {
    return (
      <Pressable onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
        {content}
      </Pressable>
    )
  }
  return content
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16,
  },
})
