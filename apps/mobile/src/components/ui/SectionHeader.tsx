import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, typography } from '@/theme/tokens'

type SectionHeaderProps = {
  title: string
  actionLabel?: string
  onActionPress?: () => void
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 16,
    color: colors.primary,
  },
  action: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    color: colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
