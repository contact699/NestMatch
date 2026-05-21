import { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp } from 'react-native'
import { SafeAreaView, Edge } from 'react-native-safe-area-context'
import { colors } from '@/theme/tokens'

type ScreenProps = {
  children: ReactNode
  scroll?: boolean
  edges?: Edge[]
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  style,
  contentStyle,
  testID,
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView testID={testID} style={[styles.root, style]} edges={edges}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView testID={testID} style={[styles.root, style]} edges={edges}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
})
