import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Heart } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'

type SavedListing = {
  id: string
  title: string
  price: number | null
  city: string | null
  photos: string[] | null
}

export default function SavedScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['saved-listings', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SavedListing[]> => {
      const { data, error } = await supabase
        .from('saved_listings')
        .select('created_at, listing:listings(id, title, price, city, photos)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      // Filter out any saves whose listing was deleted.
      return ((data ?? []) as unknown as { listing: SavedListing | null }[])
        .map((r) => r.listing)
        .filter((l): l is SavedListing => !!l)
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <ChevronLeft color={colors.onSurface} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load saved listings.</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyBody}>Tap the heart on a listing to save it here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/listing/${item.id}`)}>
              <View style={styles.thumb}>
                {item.photos && item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.thumbImg} />
                ) : (
                  <View style={styles.thumbEmpty}>
                    <Heart size={18} color={colors.outline} />
                  </View>
                )}
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>{item.city ?? 'Location TBD'}</Text>
                <Text style={styles.rowPrice}>
                  ${item.price?.toLocaleString() ?? '---'}<Text style={styles.rowPriceUnit}>/mo</Text>
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.primary },
  headerSpacer: { width: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.error },
  list: { padding: spacing[5], gap: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing[2],
    ...shadows.sm,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowMid: { flex: 1 },
  rowTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  rowMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  rowPrice: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  rowPriceUnit: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant },
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
})
