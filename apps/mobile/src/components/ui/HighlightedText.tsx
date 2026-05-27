import React from 'react'
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { colors } from '@/theme/tokens'

interface HighlightedTextProps {
  children: string
  /** Backdrop colour. Default = mint (web's secondaryContainer). */
  color?: string
  /** Fraction of the line height the highlight band covers, measured from the
   *  baseline up. Default 0.4 matches the web's `linear-gradient(transparent 60%, ...)`. */
  heightPct?: number
  textStyle?: TextStyle
  containerStyle?: ViewStyle
}

/**
 * Renders text with a hard-edged colour band behind the baseline — mirrors
 * the web hero's highlighter trick on the word `actually`.
 *
 * Caller passes the highlighted word/phrase as the child. The component sizes
 * the band to the rendered text width by relying on flow layout — the View
 * sits inside the same inline-style container as the Text and stretches via
 * absolute positioning to match width.
 */
export function HighlightedText({
  children,
  color = colors.secondaryContainer,
  heightPct = 0.4,
  textStyle,
  containerStyle,
}: HighlightedTextProps) {
  const fontSize = (textStyle?.fontSize as number | undefined) ?? 32
  const bandHeight = fontSize * heightPct

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View
        pointerEvents="none"
        style={[
          styles.band,
          { backgroundColor: color, height: bandHeight },
        ]}
      />
      <Text style={textStyle}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2, // small offset so the band sits on the baseline, not below descenders
  },
})
