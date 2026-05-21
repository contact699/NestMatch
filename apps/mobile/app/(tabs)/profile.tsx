import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { Settings, ShieldCheck, ChevronRight, Bookmark, Home as HomeIcon } from 'lucide-react-native'
import { ReactNode } from 'react'
import { Screen, Avatar, Badge, Button, Card } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'

type Profile = {
  id: string
  user_id: string
  name: string | null
  email: string | null
  profile_photo: string | null
  verification_level: 'basic' | 'verified' | 'trusted' | null
  bio: string | null
  created_at: string | null
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, profile_photo, verification_level, bio, created_at')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ])
  }

  if (isLoading) {
    return (
      <Screen testID="screen-profile">
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen testID="screen-profile">
        <View style={styles.center}><Text style={styles.errorText}>Failed to load profile.</Text></View>
      </Screen>
    )
  }

  const level = profile?.verification_level ?? 'basic'
  const verifyVariant: 'success' | 'info' | 'neutral' = level === 'trusted'
    ? 'success'
    : level === 'verified'
      ? 'info'
      : 'neutral'
  const verifyLabel = level === 'trusted' ? 'Trusted' : level === 'verified' ? 'Verified' : 'Unverified'
  const trustPct = level === 'trusted' ? 80 : level === 'verified' ? 50 : 20

  return (
    <Screen testID="screen-profile" edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.headerCard}>
          <Avatar src={profile?.profile_photo} name={profile?.name} size={80} />
          <Text style={styles.name}>{profile?.name ?? 'No name set'}</Text>
          <Text style={styles.email}>{profile?.email ?? user?.email}</Text>
          <Badge variant={verifyVariant} style={{ marginTop: 8 }}>{verifyLabel}</Badge>
        </Card>

        <Card style={styles.trustCard} variant="primary">
          <Text style={styles.trustLabel}>TRUST QUOTIENT</Text>
          <Text style={styles.trustPct}>{trustPct}%</Text>
          <View style={styles.trustBarBg}>
            <View style={[styles.trustBarFill, { width: `${trustPct}%` }]} />
          </View>
          <Text style={styles.trustHint}>
            {trustPct < 80 ? 'Add more verifications to reach Trusted' : 'You are fully verified'}
          </Text>
        </Card>

        <Card style={styles.navCard}>
          <NavRow icon={<HomeIcon size={18} color={colors.primary} />} label="My Listings" sub="Manage your listings" onPress={() => router.push('/(tabs)/search')} />
          <Sep />
          <NavRow icon={<Bookmark size={18} color={colors.primary} />} label="Saved" sub="Listings you bookmarked" onPress={() => router.push('/(tabs)/search')} />
          <Sep />
          <NavRow icon={<ShieldCheck size={18} color={colors.secondary} />} label="Trust Center" sub={`${verifyLabel} — view verifications`} onPress={() => router.push('/verify')} />
          <Sep />
          <NavRow icon={<Settings size={18} color={colors.onSurfaceVariant} />} label="Settings" sub="Privacy and account" onPress={() => router.push('/settings')} />
        </Card>

        <Button variant="danger" fullWidth onPress={handleSignOut} style={{ marginTop: 14 }}>
          Sign Out
        </Button>
      </ScrollView>
    </Screen>
  )
}

function NavRow({ icon, label, sub, onPress }: { icon: ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <View style={styles.navIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={colors.outline} />
    </Pressable>
  )
}

function Sep() {
  return <View style={styles.sep} />
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.error },
  headerCard: { alignItems: 'center', paddingVertical: 22 },
  name: {
    fontFamily: typography.fontFamily.display,
    fontSize: 22,
    color: colors.primary,
    marginTop: 12,
  },
  email: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  trustCard: { marginTop: 14 },
  trustLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    color: colors.onPrimary,
    opacity: 0.7,
    letterSpacing: 1,
  },
  trustPct: {
    fontFamily: typography.fontFamily.display,
    fontSize: 36,
    color: colors.onPrimary,
    marginTop: 4,
  },
  trustBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  trustBarFill: { height: '100%', backgroundColor: colors.secondaryContainer, borderRadius: 3 },
  trustHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onPrimary,
    opacity: 0.85,
    marginTop: 10,
  },
  navCard: { padding: 0, marginTop: 14 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  navSub: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 },
  sep: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: 62 },
})
