import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Plus, Heart, Bell } from 'lucide-react-native'
import { Screen, Card, Badge, Avatar, Button, SectionHeader } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'
import { Hero } from '@/components/home/Hero'
import { CityChipRow } from '@/components/home/CityChipRow'
import { useHomeSignals } from '@/lib/home/use-home-signals'
import { useMatchScores } from '@/lib/use-match-scores'
import { useUnreadNotificationCount } from '@/lib/use-notifications'
import { FLAGSHIP_CITIES, cityFilterOr, getFlagshipBySlug, flagshipSlugForProfileCity } from '@/lib/cities'

type RoommateCard = {
  user_id: string
  name: string | null
  age: number | null
  occupation: string | null
  city: string | null
  profile_photo: string | null
}

type ListingCard = {
  id: string
  title: string
  price: number
  city: string | null
  photos: string[] | null
}

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()

  // City selection: an explicit chip tap wins; otherwise default to the
  // user's profile city when it maps to a flagship city, falling back to
  // Toronto for cities we don't have flagship coverage for yet.
  const [chosenCitySlug, setChosenCitySlug] = useState<string | null>(null)
  const { data: profileCity } = useQuery({
    queryKey: ['home-profile-city', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('city')
        .eq('user_id', user!.id)
        .single()
      return data?.city ?? null
    },
    enabled: !!user,
  })
  const citySlug = chosenCitySlug ?? flagshipSlugForProfileCity(profileCity) ?? 'toronto'
  const city = getFlagshipBySlug(citySlug) ?? FLAGSHIP_CITIES[0]

  const { content: heroContent } = useHomeSignals(citySlug)

  const {
    data: roommates,
    isLoading: roommatesLoading,
    error: roommatesError,
    refetch: refetchRoommates,
    isRefetching: roommatesRefetching,
  } = useQuery({
    queryKey: ['home-roommates', user?.id, city.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, age, occupation, city, profile_photo')
        .neq('user_id', user!.id)
        .or(cityFilterOr(city))
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as RoommateCard[]
    },
    enabled: !!user,
  })

  const {
    data: listings,
    isLoading: listingsLoading,
    error: listingsError,
    refetch: refetchListings,
    isRefetching: listingsRefetching,
  } = useQuery({
    queryKey: ['home-listings', user?.id, city.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, photos')
        .eq('is_active', true)
        .or(cityFilterOr(city))
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as ListingCard[]
    },
    enabled: !!user,
  })

  // Real compatibility scores for the visible roommates (batch RPC). Never show
  // a fabricated number — the badge is hidden when a score is missing.
  const roommateIds = useMemo(
    () => (roommates ?? []).map((r) => r.user_id),
    [roommates]
  )
  const { data: matchScores } = useMatchScores(roommateIds)

  const unreadCount = useUnreadNotificationCount()

  const renderRoommate = ({ item }: { item: RoommateCard }) => {
    const score = matchScores?.[item.user_id]
    return (
      <Pressable
        style={styles.roommateCard}
        onPress={() => router.push(`/user/${item.user_id}`)}
      >
        <Avatar src={item.profile_photo} name={item.name} size={56} style={styles.roommateAvatar} />
        <Text style={styles.roommateName} numberOfLines={1}>
          {item.name ?? 'Anonymous'}
          {item.age ? `, ${item.age}` : ''}
        </Text>
        <Text style={styles.roommateMeta} numberOfLines={1}>
          {[item.occupation, item.city].filter(Boolean).join(' · ') || 'NestMatch member'}
        </Text>
        {typeof score === 'number' ? (
          <Badge variant="success" style={styles.roommateMatch}>{score}% match</Badge>
        ) : null}
      </Pressable>
    )
  }

  const browseCity = (slug: string) => {
    const target = getFlagshipBySlug(slug)
    if (!target) return
    router.push({ pathname: '/(tabs)/search', params: { q: target.displayName } })
  }

  return (
    <Screen testID="screen-home" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={listingsRefetching || roommatesRefetching}
            onRefresh={() => {
              refetchListings()
              refetchRoommates()
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.bellBtn}
            onPress={() => router.push('/notifications')}
            hitSlop={8}
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={colors.primary} />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {heroContent ? (
          <Hero content={heroContent} onBrowseCity={browseCity} />
        ) : null}

        <CityChipRow selectedSlug={citySlug} onSelect={setChosenCitySlug} />

        <SectionHeader
          title={`Fresh listings in ${city.displayName}`}
          actionLabel="SEE ALL"
          onActionPress={() => router.push('/(tabs)/search')}
        />
        {listingsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : listingsError ? (
          <Card>
            <Text style={styles.errorTitle}>Could not load listings</Text>
            <Text style={styles.emptyBody}>Check your connection and try again.</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => refetchListings()}
              style={{ marginTop: 10 }}
            >
              Retry
            </Button>
          </Card>
        ) : (listings?.length ?? 0) === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyBody}>Be the first — list your place.</Text>
          </Card>
        ) : (
          listings!.map((l) => (
            <Pressable
              key={l.id}
              style={styles.listing}
              onPress={() => router.push(`/listing/${l.id}`)}
            >
              <View style={styles.listingImg}>
                {l.photos && l.photos[0] ? (
                  <Image source={{ uri: l.photos[0] }} style={styles.listingPhoto} />
                ) : null}
                <View style={styles.heart}>
                  <Heart size={14} color={colors.primary} />
                </View>
              </View>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.listingMeta} numberOfLines={1}>{l.city ?? 'Location TBD'}</Text>
                <Text style={styles.listingPrice}>
                  ${l.price?.toLocaleString() ?? '---'}<Text style={styles.listingPriceUnit}>/mo</Text>
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <SectionHeader
          title="Roommates you'll click with"
          actionLabel="SEE ALL"
          onActionPress={() => router.push('/(tabs)/search')}
        />
        {roommatesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : roommatesError ? (
          <Card>
            <Text style={styles.errorTitle}>Could not load roommates</Text>
            <Text style={styles.emptyBody}>Check your connection and try again.</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => refetchRoommates()}
              style={{ marginTop: 10 }}
            >
              Retry
            </Button>
          </Card>
        ) : (
          <FlatList
            horizontal
            data={roommates ?? []}
            keyExtractor={(i) => i.user_id}
            renderItem={renderRoommate}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            ListEmptyComponent={
              <Card style={styles.empty}>
                <Text style={styles.emptyTitle}>No roommates yet</Text>
                <Text style={styles.emptyBody}>Be among the first — complete your profile.</Text>
              </Card>
            }
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/listing/create')}
      >
        <Plus color={colors.onPrimary} size={26} />
      </TouchableOpacity>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[5], paddingBottom: 100 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing[2],
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 9,
    color: colors.onError,
  },
  hList: { gap: spacing[2], paddingRight: spacing[4] },
  roommateCard: {
    width: 150,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing[3],
    ...shadows.sm,
  },
  roommateAvatar: { alignSelf: 'center', marginBottom: spacing[2] },
  roommateName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
  },
  roommateMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing[2],
  },
  roommateMatch: { alignSelf: 'center' },
  listing: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  listingImg: {
    height: 120,
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
  },
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
  listingInfo: { padding: spacing[3] },
  listingTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  listingMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  listingPrice: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  listingPriceUnit: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  empty: { width: 240, padding: spacing[4] },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.error,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: spacing[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
})
