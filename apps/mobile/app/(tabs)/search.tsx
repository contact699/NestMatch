import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'

type Listing = {
  id: string
  title: string
  price: number
  city: string | null
  description: string | null
}

export default function SearchScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: listings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['listings', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('listings')
        .select('id, title, price, city, description')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30)

      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Listing[]
    },
  })

  const renderListing = ({ item }: { item: Listing }) => (
    <Pressable
      style={({ pressed }) => [
        styles.listingCard,
        pressed && styles.listingCardPressed,
      ]}
      onPress={() => router.push(`/listing/${item.id}`)}
    >
      <View style={styles.listingHeader}>
        <Text style={styles.listingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.listingPrice}>
          ${item.price?.toLocaleString() ?? '---'}/mo
        </Text>
      </View>
      {item.city && <Text style={styles.listingCity}>{item.city}</Text>}
      {item.description && (
        <Text style={styles.listingDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </Pressable>
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or city..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Failed to load listings. Please try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListing}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search terms.'
                  : 'No active listings available right now.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  listingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  listingCardPressed: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  listingCity: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  listingDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
})
