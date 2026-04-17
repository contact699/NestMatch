import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useAuth } from '../../src/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const userName = user?.user_metadata?.name ?? 'there'

  const { data: listingsCount, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)

      if (error) throw error
      return count ?? 0
    },
    enabled: !!user,
  })

  const { data: messagesCount, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .contains('participant_ids', [user!.id])

      if (error) throw error
      return count ?? 0
    },
    enabled: !!user,
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Hello, {userName}!</Text>
          <Text style={styles.welcomeText}>
            Welcome back to NestMatch. Here's your overview.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>My Listings</Text>
            {listingsLoading ? (
              <ActivityIndicator color="#2563eb" style={styles.statLoader} />
            ) : (
              <Text style={styles.statValue}>{listingsCount ?? 0}</Text>
            )}
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Messages</Text>
            {messagesLoading ? (
              <ActivityIndicator color="#2563eb" style={styles.statLoader} />
            ) : (
              <Text style={styles.statValue}>{messagesCount ?? 0}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Browse Listings</Text>
            <Text style={styles.actionDescription}>
              Search for available rooms and apartments near you.
            </Text>
          </View>
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Complete Your Profile</Text>
            <Text style={styles.actionDescription}>
              A complete profile helps you find better matches.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button — Create Listing */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/listing/create')}
      >
        <Plus color="#ffffff" size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLoader: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
})
