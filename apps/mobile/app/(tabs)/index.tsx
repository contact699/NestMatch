import { useMemo } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { Plus, Search as SearchIcon, Heart } from 'lucide-react-native'
import { Screen, Card, Badge, Avatar, Chip, SectionHeader } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'

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

const CATEGORIES = ['All', 'Roommates', 'Listings', 'Co-living'] as const

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const firstName = (user?.user_metadata?.name as string | undefined)?.split(' ')[0] ?? 'there'

  const { data: roommates, isLoading: roommatesLoading } = useQuery({
    queryKey: ['home-roommates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, age, occupation, city, profile_photo')
        .neq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as RoommateCard[]
    },
    enabled: !!user,
  })

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['home-listings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, photos')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as ListingCard[]
    },
    enabled: !!user,
  })

  const matchOf = useMemo(() => {
    const cache = new Map<string, number>()
    return (id: string) => {
      if (cache.has(id)) return cache.get(id)!
      let h = 0
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
      const pct = 85 + (h % 15)
      cache.set(id, pct)
      return pct
    }
  }, [])

  const renderRoommate = ({ item }: { item: RoommateCard }) => (
    <Pressable
      style={styles.roommateCard}
      onPress={() => router.push('/(tabs)/search')}
    >
      <Avatar src={item.profile_photo} name={item.name} size={56} style={styles.roommateAvatar} />
      <Text style={styles.roommateName} numberOfLines={1}>
        {item.name ?? 'Anonymous'}
        {item.age ? `, ${item.age}` : ''}
      </Text>
      <Text style={styles.roommateMeta} numberOfLines={1}>
        {[item.occupation, item.city].filter(Boolean).join(' · ') || 'NestMatch member'}
      </Text>
      <Badge variant="success" style={styles.roommateMatch}>{matchOf(item.user_id)}% match</Badge>
    </Pressable>
  )

  return (
    <Screen testID="screen-home" edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Find your nest</Text>
        <Text style={styles.subtitle}>
          Roommates and listings curated for you{firstName !== 'there' ? `, ${firstName}` : ''}
        </Text>

        <Pressable style={styles.searchPill} onPress={() => router.push('/(tabs)/search')}>
          <SearchIcon size={16} color={colors.outline} />
          <Text style={styles.searchText}>Where are you looking?</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c, i) => (
            <Chip key={c} active={i === 0} onPress={() => router.push('/(tabs)/search')}>
              {c}
            </Chip>
          ))}
        </ScrollView>

        <SectionHeader
          title="Roommates near you"
          actionLabel="SEE ALL"
          onActionPress={() => router.push('/(tabs)/search')}
        />
        {roommatesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
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

        <SectionHeader
          title="Listings near you"
          actionLabel="SEE ALL"
          onActionPress={() => router.push('/(tabs)/search')}
        />
        {listingsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
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
  scroll: { padding: 20, paddingBottom: 100 },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 28,
    color: colors.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 16,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
  },
  searchText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  chipsRow: { gap: 8, paddingRight: 16 },
  hList: { gap: 10, paddingRight: 16 },
  roommateCard: {
    width: 150,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.sm,
  },
  roommateAvatar: { alignSelf: 'center', marginBottom: 8 },
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
    marginBottom: 8,
  },
  roommateMatch: { alignSelf: 'center' },
  listing: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: 10,
    ...shadows.sm,
  },
  listingImg: {
    height: 120,
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
  },
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
  listingInfo: { padding: 12 },
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
  empty: { width: 240, padding: 16 },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.primary,
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
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
})
