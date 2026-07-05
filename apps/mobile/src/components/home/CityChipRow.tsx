import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Chip } from '@/components/ui'
import { FLAGSHIP_CITIES } from '@/lib/cities'
import { spacing } from '@/theme/tokens'

interface CityChipRowProps {
  selectedSlug: string
  onSelect: (slug: string) => void
}

/**
 * Horizontal scrollable row of the 5 flagship-city chips. Replaces the
 * pre-redesign 4-mode chip row (All / Roommates / Listings / Co-living)
 * which duplicated tab-bar destinations.
 */
export function CityChipRow({ selectedSlug, onSelect }: CityChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FLAGSHIP_CITIES.map((c) => (
        <Chip
          key={c.slug}
          active={c.slug === selectedSlug}
          onPress={() => onSelect(c.slug)}
        >
          {c.displayName}
        </Chip>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: spacing[2],
    paddingRight: spacing[4],
    paddingBottom: spacing[2],
  },
})
