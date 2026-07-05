import {
  ActivityIndicator,
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
import { Users, ChevronRight, Globe } from 'lucide-react-native'
import { Screen, Card, Badge, Button, SectionHeader } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'

type MyGroup = {
  id: string
  name: string
  isAdmin: boolean
  memberCount: number
}

type DiscoverGroup = {
  id: string
  name: string
  description: string | null
  group_size_min: number | null
  group_size_max: number | null
}

export default function GroupsScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const myGroups = useQuery({
    queryKey: ['my-groups', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyGroup[]> => {
      const { data, error } = await supabase.rpc('get_my_active_groups')
      if (error) throw error
      const rows = (data ?? []) as { group_id: string; group_name: string; is_admin: boolean }[]
      if (rows.length === 0) return []

      const ids = rows.map((r) => r.group_id)
      // Member counts: RLS lets members view members of their own groups, so
      // this tally is accurate for groups the user belongs to.
      const { data: members } = await supabase
        .from('co_renter_members')
        .select('group_id')
        .in('group_id', ids)
        .eq('status', 'active')

      const counts = new Map<string, number>()
      for (const m of (members ?? []) as { group_id: string }[]) {
        counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1)
      }

      return rows.map((r) => ({
        id: r.group_id,
        name: r.group_name,
        isAdmin: r.is_admin,
        memberCount: counts.get(r.group_id) ?? 0,
      }))
    },
  })

  const discover = useQuery({
    queryKey: ['discover-groups', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DiscoverGroup[]> => {
      const { data, error } = await supabase
        .from('co_renter_groups')
        .select('id, name, description, group_size_min, group_size_max')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as DiscoverGroup[]
    },
  })

  const myIds = new Set((myGroups.data ?? []).map((g) => g.id))
  const discoverGroups = (discover.data ?? []).filter((g) => !myIds.has(g.id))

  return (
    <Screen testID="screen-groups" edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Text style={styles.title}>Groups</Text>
        </View>

        <SectionHeader title="My groups" />
        {myGroups.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : myGroups.error ? (
          <ErrorCard onRetry={() => myGroups.refetch()} />
        ) : (myGroups.data?.length ?? 0) === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>You are not in any groups yet</Text>
            <Text style={styles.emptyBody}>
              Join a public group below to search for a place together.
            </Text>
          </Card>
        ) : (
          myGroups.data!.map((g) => (
            <Pressable
              key={g.id}
              style={styles.row}
              onPress={() => router.push(`/group/${g.id}`)}
            >
              <View style={styles.rowIcon}>
                <Users size={18} color={colors.primary} />
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowName} numberOfLines={1}>{g.name}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[
                    g.isAdmin ? 'Admin' : 'Member',
                    g.memberCount > 0 ? `${g.memberCount} member${g.memberCount === 1 ? '' : 's'}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.outline} />
            </Pressable>
          ))
        )}

        <View style={{ height: spacing[4] }} />

        <SectionHeader title="Discover public groups" />
        {discover.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : discover.error ? (
          <ErrorCard onRetry={() => discover.refetch()} />
        ) : discoverGroups.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No public groups right now</Text>
            <Text style={styles.emptyBody}>Check back soon — new groups form all the time.</Text>
          </Card>
        ) : (
          discoverGroups.map((g) => (
            <Pressable
              key={g.id}
              style={styles.row}
              onPress={() => router.push(`/group/${g.id}`)}
            >
              <View style={styles.rowIcon}>
                <Globe size={18} color={colors.secondary} />
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowName} numberOfLines={1}>{g.name}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {g.description
                    ? g.description
                    : g.group_size_min && g.group_size_max
                      ? `Looking for ${g.group_size_min}–${g.group_size_max} people`
                      : 'Public group'}
                </Text>
              </View>
              <Badge variant="info">Join</Badge>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  )
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <Text style={styles.errorText}>Could not load groups.</Text>
      <Button variant="outline" size="sm" onPress={onRetry} style={{ marginTop: 10 }}>
        Retry
      </Button>
    </Card>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[5], paddingBottom: spacing[8] },
  head: { marginBottom: spacing[2] },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 26,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  loader: { marginVertical: spacing[6] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: { flex: 1 },
  rowName: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.primary },
  rowMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
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
  errorText: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.error },
})
