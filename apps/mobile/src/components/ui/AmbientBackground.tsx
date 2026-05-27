import React from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface AmbientBackgroundProps {
  children: React.ReactNode
  style?: ViewStyle
  testID?: string
}

/**
 * Background wash that mimics the web hero's two soft radial blooms.
 * Layered linear gradients from corners (top-left navy tint, top-right teal
 * tint, bottom warm peach tint). The web uses true radial gradients; RN's
 * built-in gradients are linear-only, but the perceived effect is similar
 * enough at hero size on a phone screen.
 */
export function AmbientBackground({ children, style, testID }: AmbientBackgroundProps) {
  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <LinearGradient
        // Top-left bloom: navy 8% → transparent, anchored top-left
        colors={['rgba(0,32,69,0.10)', 'rgba(0,32,69,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        // Top-right bloom: teal 10% → transparent, anchored top-right
        colors={['rgba(0,106,96,0.10)', 'rgba(0,106,96,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        // Bottom warm bloom: peach 45% → transparent, anchored bottom
        colors={['rgba(255,220,196,0)', 'rgba(255,220,196,0.45)']}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
})
