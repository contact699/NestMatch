import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Flag, MessageCircle, Ban } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { promptBlock, promptReport } from '@/lib/api'
import { Avatar, Badge, Button, Card } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'

/**
 * Public columns only. Migration 038 replaced the anon SELECT on `profiles`
 * with a fixed column allowlist, and email / phone / stripe_customer_id are
 * deliberately not on it — never widen this projection to `*`.
 */
const PUBLIC_PROFILE_COLUMNS =
  'name, bio, city, province, occupation, languages, profile_photo, verification_level, email_verified, phone_verified, show_verification_badges'

type PublicProfile = {
  name: string | null
  bio: string | null
  city: string | null
  province: string | null
  occupation: string | null
  languages: string[] | null
  profile_photo: string | null
  verification_level: 'basic' | 'verified' | 'trusted' | null
  email_verified: boolean | null
  phone_verified: boolean | null
  show_verification_badges: boolean | null
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const isSelf = !!user && user.id === id

  const profileQuery = useQuery({
    queryKey: ['public-profile', id],
    enabled: !!id,
    queryFn: async (): Promise<PublicProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_COLUMNS)
        .eq('user_id', id!)
        .single()
      if (error) throw error
      return data as unknown as PublicProfile
    },
  })

  // Find the existing 1:1 conversation (no listing, no group) or start one, then
  // open it — the QA finding was that "Message" left people on the list screen.
  const messageMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!user || !id) throw new Error('Not signed in')

      const { data: existing, error: existingError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, id])
        .is('listing_id', null)
        .is('group_id', null)
        .limit(1)
      if (existingError) throw existingError
      if (existing && existing.length > 0) return existing[0].id as string

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ participant_ids: [user.id, id] })
        .select('id')
        .single()
      if (error) throw error
      return created.id as string
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      router.push(`/conversation/${conversationId}`)
    },
    onError: () => {
      Alert.alert('Could not start conversation', 'Please try again in a moment.')
    },
  })

  const profile = profileQuery.data
  const displayName = profile?.name ?? 'NestMatch member'
  const showBadges = profile?.show_verification_badges !== false
  const level = profile?.verification_level ?? 'basic'
  const location = [profile?.city, profile?.province].filter(Boolean).join(', ')
  const languages = (profile?.languages ?? []).filter(Boolean)

  const handleBlocked = () => {
    // Drop every list that could still be showing this person.
    queryClient.invalidateQueries({ queryKey: ['search-roommates'] })
    queryClient.invalidateQueries({ queryKey: ['home-roommates'] })
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    router.back()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <ChevronLeft color={colors.onSurface} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Profile
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {profileQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : profileQuery.error || !profile ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load this profile.</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => profileQuery.refetch()}
            style={{ marginTop: 12 }}
          >
            Retry
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card style={styles.headerCard}>
            <Avatar src={profile.profile_photo} name={profile.name} size={88} />
            <Text style={styles.name}>{displayName}</Text>
            {profile.occupation ? (
              <Text style={styles.meta}>{profile.occupation}</Text>
            ) : null}
            {location ? <Text style={styles.meta}>{location}</Text> : null}

            {showBadges ? (
              <View style={styles.badgeRow}>
                {level === 'trusted' ? (
                  <Badge variant="success">Trusted</Badge>
                ) : level === 'verified' ? (
                  <Badge variant="info">Verified</Badge>
                ) : (
                  <Badge variant="neutral">Basic member</Badge>
                )}
                {profile.email_verified ? <Badge variant="success">Email verified</Badge> : null}
                {profile.phone_verified ? <Badge variant="success">Phone verified</Badge> : null}
              </View>
            ) : null}
          </Card>

          {profile.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          {languages.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages</Text>
              <View style={styles.chipRow}>
                {languages.map((lang) => (
                  <View key={lang} style={styles.chip}>
                    <Text style={styles.chipText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {!isSelf ? (
            <>
              <Button
                fullWidth
                style={styles.messageButton}
                leftIcon={<MessageCircle size={18} color={colors.onPrimary} />}
                loading={messageMutation.isPending}
                onPress={() => messageMutation.mutate()}
              >
                Message
              </Button>

              <View style={styles.safetyRow}>
                <Pressable
                  style={styles.safetyBtn}
                  onPress={() => promptReport({ userId: id }, displayName)}
                >
                  <Flag size={16} color={colors.onSurfaceVariant} />
                  <Text style={styles.safetyText}>Report</Text>
                </Pressable>
                <Pressable
                  style={styles.safetyBtn}
                  onPress={() => promptBlock(id!, displayName, handleBlocked)}
                >
                  <Ban size={16} color={colors.error} />
                  <Text style={[styles.safetyText, styles.safetyTextDanger]}>Block</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          <View style={{ height: spacing[8] }} />
        </ScrollView>
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
  scroll: { padding: spacing[5], paddingBottom: spacing[8] },
  headerCard: { alignItems: 'center', paddingVertical: 22 },
  name: {
    fontFamily: typography.fontFamily.display,
    fontSize: 22,
    color: colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  meta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  section: {
    marginTop: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing[3],
  },
  bio: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  messageButton: { marginTop: spacing[6] },
  safetyRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  safetyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.sm,
  },
  safetyText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  safetyTextDanger: { color: colors.error },
})
