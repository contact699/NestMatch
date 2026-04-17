import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useAuth } from '../../src/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Settings, ShieldCheck, ChevronRight } from 'lucide-react-native'

type Profile = {
  id: string
  name: string | null
  email: string | null
  profile_photo: string | null
  verification_level: string | null
  bio: string | null
  created_at: string | null
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, profile_photo, verification_level, bio, created_at')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ])
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
  }

  const getVerificationBadge = (level: string | null) => {
    switch (level) {
      case 'verified':
        return { label: 'Verified', color: '#16a34a', bg: '#f0fdf4' }
      case 'pending':
        return { label: 'Pending', color: '#ca8a04', bg: '#fefce8' }
      default:
        return { label: 'Unverified', color: '#64748b', bg: '#f1f5f9' }
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load profile.</Text>
      </View>
    )
  }

  const badge = getVerificationBadge(profile?.verification_level ?? null)

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {(profile?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {profile?.name ?? 'No name set'}
          </Text>
          <Text style={styles.profileEmail}>
            {profile?.email ?? user?.email ?? ''}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Bio</Text>
            <Text style={styles.infoValue}>
              {profile?.bio ?? 'No bio added yet.'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {formatDate(profile?.created_at ?? null)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.navCard}>
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => router.push('/verify')}
            >
              <View style={styles.navRowLeft}>
                <View style={[styles.navIconCircle, { backgroundColor: '#f0fdf4' }]}>
                  <ShieldCheck color="#16a34a" size={18} />
                </View>
                <View>
                  <Text style={styles.navRowLabel}>Trust Center</Text>
                  <Text style={styles.navRowSub}>
                    {badge.label} — view verifications
                  </Text>
                </View>
              </View>
              <ChevronRight color="#94a3b8" size={20} />
            </TouchableOpacity>

            <View style={styles.navSeparator} />

            <TouchableOpacity
              style={styles.navRow}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.navRowLeft}>
                <View style={[styles.navIconCircle, { backgroundColor: '#f1f5f9' }]}>
                  <Settings color="#64748b" size={18} />
                </View>
                <View>
                  <Text style={styles.navRowLabel}>Settings</Text>
                  <Text style={styles.navRowSub}>
                    Profile, privacy, notifications
                  </Text>
                </View>
              </View>
              <ChevronRight color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLargeText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  navCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 1,
  },
  navRowSub: {
    fontSize: 13,
    color: '#64748b',
  },
  navSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginLeft: 62,
  },
  signOutButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 8,
  },
  signOutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
})
