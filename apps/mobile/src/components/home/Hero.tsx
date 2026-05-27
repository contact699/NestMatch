import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { AmbientBackground, HighlightedText } from '@/components/ui'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { HeroContent, HeroCtaTarget } from '@/lib/home/types'

interface HeroProps {
  content: HeroContent
  onBrowseCity: (citySlug: string) => void
}

export function Hero({ content, onBrowseCity }: HeroProps) {
  const router = useRouter()

  const handlePress = (target: HeroCtaTarget) => {
    if (target.kind === 'route') {
      // expo-router accepts a string path or a Href object.
      router.push({ pathname: target.pathname as any, params: target.params })
    } else {
      onBrowseCity(target.citySlug)
    }
  }

  const isLoading = content.variant === 'loading'

  return (
    <AmbientBackground style={styles.wrap}>
      <Text style={[styles.eyebrow, isLoading && styles.skeletonText]}>
        {content.eyebrow}
      </Text>

      <View style={styles.headlineRow}>
        <Text style={styles.headlineLead}>
          {content.headline.lead}
        </Text>
        <HighlightedText textStyle={styles.headlineHighlight}>
          {content.headline.highlighted}
        </HighlightedText>
        {content.headline.trail ? (
          <Text style={styles.headlineLead}>{content.headline.trail}</Text>
        ) : null}
      </View>

      {content.subhead ? (
        <Text style={styles.subhead}>{content.subhead}</Text>
      ) : null}

      <View style={styles.ctaRow}>
        <Pressable
          style={[styles.primaryCta, isLoading && styles.disabledCta]}
          onPress={() => !isLoading && handlePress(content.primaryCta.target)}
          disabled={isLoading}
          accessibilityRole="button"
        >
          <Text style={styles.primaryCtaText}>{content.primaryCta.label}</Text>
        </Pressable>
        {content.secondaryCta ? (
          <Pressable
            style={styles.secondaryCta}
            onPress={() => handlePress(content.secondaryCta!.target)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryCtaText}>{content.secondaryCta.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </AmbientBackground>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
    borderRadius: radii.xl,
    marginBottom: spacing[3],
  },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xs,
    color: colors.secondary,
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  skeletonText: {
    color: colors.surfaceContainer, // hide while loading
  },
  headlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  headlineLead: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
  },
  headlineHighlight: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
  },
  subhead: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.onSurfaceVariant,
    marginTop: spacing[3],
    lineHeight: typography.size.base * typography.lineHeight.normal,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  primaryCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
  },
  disabledCta: {
    opacity: 0.6,
  },
  primaryCtaText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    color: colors.onPrimary,
  },
  secondaryCta: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
  },
  secondaryCtaText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
})
