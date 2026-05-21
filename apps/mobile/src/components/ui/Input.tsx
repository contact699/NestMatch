import { forwardRef, ReactNode, useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type InputProps = TextInputProps & {
  label?: string
  error?: string
  leftIcon?: ReactNode
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, leftIcon, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : colors.outlineVariant

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, { borderColor }]}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={colors.outline}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
})
