import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Search as SearchIcon, Heart } from 'lucide-react-native'
import { Screen, Input, Avatar, Badge, Button } from '@/components/ui'
import { useMatchScores } from '@/lib/use-match-scores'
import { colors, radii, shadows, typography } from '@/theme/tokens'

/**
 * PostgREST's `or()` filter is parsed as a comma-separated list of
 * `column.operator.value` triples, so a raw query containing `,` `(` `)` or `.`
 * produces a 400 rather than a search (QA: "Montréal, ON" failed). Keep only
 * the text before the first separator and strip the remaining metacharacters —
 * "Montréal, ON" searches for "Montréal", which matches.
 */
function sanitizeSearchTerm(raw: string): string {
  const firstSegment = raw.split(/[,()]/)[0] ?? ''
  return firstSegment
    .replace(/[.%\\"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Listing = {
  id: string
  title: string
  price: number
  city: string | null
  photos: string[] | null
}

type RoommateRow = {
  user_id: string
  name: string | null
  age: number | null
  occupation: string | null
  city: string | null
  profile_photo: string | null
}

type Segment = 'listings' | 'roommates'

export default function SearchScreen() {
  const router = useRouter()
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>()
  const [segment, setSegment] = useState<Segment>('listings')
  const [query, setQuery] = useState<string>(initialQuery ?? '')

  // If the user lands here from the hero with a new q param while the screen
  // is already mounted, sync state. Cheap; no-op once initialQuery stabilizes.
  useEffect(() => {
    if (initialQuery !== undefined) setQuery(initialQuery)
  }, [initialQuery])

  const term = useMemo(() => sanitizeSearchTerm(query), [query])

  const listingsQuery = useQuery({
    queryKey: ['search-listings', term],
    queryFn: async () => {
      let q = supabase
        .from('listings')
        .select('id, title, price, city, photos')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50)
      if (term) {
        q = q.or(`title.ilike.%${term}%,city.ilike.%${term}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Listing[]
    },
    enabled: segment === 'listings',
  })

  const roommatesQuery = useQuery({
    queryKey: ['search-roommates', term],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('user_id, name, age, occupation, city, profile_photo')
        .order('created_at', { ascending: false })
        .limit(50)
      if (term) {
        q = q.or(`name.ilike.%${term}%,city.ilike.%${term}%,occupation.ilike.%${term}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as RoommateRow[]
    },
    enabled: segment === 'roommates',
  })

  const active = segment === 'listings' ? listingsQuery : roommatesQuery

  // Real compatibility scores for the roommate results (batch RPC). Badge falls
  // back to "View" when a score is unavailable — never a fabricated number.
  const roommateIds = (roommatesQuery.data ?? []).map((r) => r.user_id)
  const { data: matchScores } = useMatchScores(roommateIds)

  return (
    <Screen testID="screen-search" edges={['bottom']}>
      <View style={styles.head}>
        <Text style={styles.title}>Discover</Text>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setSegment('listings')}
            style={[styles.segBtn, segment === 'listings' && styles.segBtnActive]}
          >
            <Text style={[styles.segText, segment === 'listings' && styles.segTextActive]}>Listings</Text>
          </Pressable>
          <Pressable
            onPress={() => setSegment('roommates')}
            style={[styles.segBtn, segment === 'roommates' && styles.segBtnActive]}
          >
            <Text style={[styles.segText, segment === 'roommates' && styles.segTextActive]}>Roommates</Text>
          </Pressable>
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={segment === 'listings' ? 'Search by title or city' : 'Search by name, city, occupation'}
          leftIcon={<SearchIcon size={18} color={colors.outline} />}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : active.error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load results.</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => active.refetch()}
            style={{ marginTop: 12 }}
          >
            Retry
          </Button>
        </View>
      ) : segment === 'listings' ? (
        <FlatList
          data={(listingsQuery.data ?? []) as Listing[]}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={listingsQuery.isRefetching}
              onRefresh={() => listingsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyBody}>
                {query ? 'Try a different search.' : 'No active listings right now.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.listing} onPress={() => router.push(`/listing/${item.id}`)}>
              <View style={styles.listingImg}>
                {item.photos && item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.listingPhoto} />
                ) : null}
                <View style={styles.heart}><Heart size={14} color={colors.primary} /></View>
              </View>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.listingMeta} numberOfLines={1}>{item.city ?? '—'}</Text>
                <Text style={styles.listingPrice}>
                  ${item.price?.toLocaleString() ?? '---'}<Text style={styles.listingPriceUnit}>/mo</Text>
                </Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={(roommatesQuery.data ?? []) as RoommateRow[]}
          keyExtractor={(i) => i.user_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={roommatesQuery.isRefetching}
              onRefresh={() => roommatesQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No roommates found</Text>
              <Text style={styles.emptyBody}>
                {query ? 'Try a different search.' : 'Check back later.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.profile}
              onPress={() => router.push(`/user/${item.user_id}`)}
            >
              <Avatar src={item.profile_photo} name={item.name} size={48} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {item.name ?? 'Anonymous'}{item.age ? `, ${item.age}` : ''}
                </Text>
                <Text style={styles.profileMeta} numberOfLines={1}>
                  {[item.occupation, item.city].filter(Boolean).join(' · ') || 'NestMatch member'}
                </Text>
              </View>
              {typeof matchScores?.[item.user_id] === 'number' ? (
                <Badge variant="success">{matchScores[item.user_id]}% match</Badge>
              ) : (
                <Badge variant="neutral">View</Badge>
              )}
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: { padding: 20, paddingBottom: 8, gap: 12 },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 26,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  segBtnActive: { backgroundColor: colors.surfaceContainerLowest, ...shadows.sm },
  segText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  segTextActive: { color: colors.primary, fontFamily: typography.fontFamily.bodyBold },
  list: { padding: 20, paddingTop: 0, gap: 10 },
  center: { padding: 40, alignItems: 'center' },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.error,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 15,
    color: colors.primary,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  listing: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listingImg: { height: 140, backgroundColor: colors.surfaceContainer, position: 'relative' },
  listingPhoto: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingInfo: { padding: 14 },
  listingTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.primary },
  listingMeta: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  listingPrice: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.secondary, marginTop: 4 },
  listingPriceUnit: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.sm,
  },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  profileMeta: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
})
