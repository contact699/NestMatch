import { Image, ImageStyle, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native'
import { colors, typography } from '@/theme/tokens'

type AvatarProps = {
  src?: string | null
  name?: string | null
  size?: number
  style?: StyleProp<ViewStyle & ImageStyle>
}

function initialsOf(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Avatar({ src, name, size = 48, style }: AvatarProps) {
  const radius = size / 2
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      />
    )
  }
  const fontSize = Math.max(12, size * 0.4)
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initialsOf(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.onSecondaryContainer,
  },
})
