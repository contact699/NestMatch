import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  MessageCircle,
  Receipt,
  Check,
  X,
  ChevronRight,
} from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { Avatar, Badge, Button, Card } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'

type Group = {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_by: string | null
  group_size_min: number | null
  group_size_max: number | null
  status: string | null
}

type Membership = { role: string; status: string } | null

type Member = {
  user_id: string
  role: string
  name: string | null
  profile_photo: string | null
}

type JoinRequest = {
  id: string
  user_id: string
  message: string | null
  name: string | null
  profile_photo: string | null
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [requestMessage, setRequestMessage] = useState('')

  const groupQuery = useQuery({
    queryKey: ['group-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<Group> => {
      const { data, error } = await supabase
        .from('co_renter_groups')
        .select('id, name, description, is_public, created_by, group_size_min, group_size_max, status')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Group
    },
  })

  const membershipQuery = useQuery({
    queryKey: ['group-membership', id, user?.id],
    enabled: !!id && !!user,
    queryFn: async (): Promise<Membership> => {
      const { data } = await supabase
        .from('co_renter_members')
        .select('role, status')
        .eq('group_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle()
      return (data as Membership) ?? null
    },
  })

  const isMember = membershipQuery.data?.status === 'active'
  const isAdmin = isMember && membershipQuery.data?.role === 'admin'

  const membersQuery = useQuery({
    queryKey: ['group-members', id],
    enabled: !!id,
    queryFn: async (): Promise<Member[]> => {
      // RLS lets members view members of their own group; for a public group the
      // caller has not joined, this may return nothing — handled gracefully.
      const { data: rows } = await supabase
        .from('co_renter_members')
        .select('user_id, role')
        .eq('group_id', id!)
        .eq('status', 'active')
      const members = (rows ?? []) as { user_id: string; role: string }[]
      if (members.length === 0) return []

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo')
        .in('user_id', members.map((m) => m.user_id))
      const pmap = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      )
      return members.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        name: pmap.get(m.user_id)?.name ?? null,
        profile_photo: pmap.get(m.user_id)?.profile_photo ?? null,
      }))
    },
  })

  const myRequestQuery = useQuery({
    queryKey: ['group-my-request', id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('co_renter_join_requests')
        .select('id, status')
        .eq('group_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle()
      return (data as { id: string; status: string } | null) ?? null
    },
  })

  const pendingQuery = useQuery({
    queryKey: ['group-pending-requests', id],
    enabled: !!id && isAdmin,
    queryFn: async (): Promise<JoinRequest[]> => {
      const { data: reqs } = await supabase
        .from('co_renter_join_requests')
        .select('id, user_id, message')
        .eq('group_id', id!)
        .eq('status', 'pending')
      const requests = (reqs ?? []) as { id: string; user_id: string; message: string | null }[]
      if (requests.length === 0) return []

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo')
        .in('user_id', requests.map((r) => r.user_id))
      const pmap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))
      return requests.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        message: r.message,
        name: pmap.get(r.user_id)?.name ?? null,
        profile_photo: pmap.get(r.user_id)?.profile_photo ?? null,
      }))
    },
  })

  const requestJoin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('co_renter_join_requests').insert({
        group_id: id!,
        user_id: user!.id,
        message: requestMessage.trim() || null,
      })
      // 23505 = unique violation → a request already exists; treat as success.
      if (error && (error as any).code !== '23505') throw error
    },
    onSuccess: () => {
      setRequestMessage('')
      queryClient.invalidateQueries({ queryKey: ['group-my-request', id, user?.id] })
    },
    onError: () => {
      Alert.alert('Could not send request', 'Please try again in a moment.')
    },
  })

  const accept = useMutation({
    mutationFn: async (req: JoinRequest) => {
      // Add the member first: if this fails the request stays pending and the
      // admin can simply retry. 23505 = already a member → fine, proceed.
      const { error: memErr } = await supabase.from('co_renter_members').insert({
        group_id: id!,
        user_id: req.user_id,
        role: 'member',
        status: 'active',
      })
      if (memErr && (memErr as { code?: string }).code !== '23505') throw memErr

      const { error: updErr } = await supabase
        .from('co_renter_join_requests')
        .update({ status: 'accepted', reviewed_by: user!.id })
        .eq('id', req.id)
      if (updErr) throw updErr

      // Group chat access now follows group membership via group_id (migration
      // 032), so this is no longer what grants the new member access. Keep it as
      // best-effort reconciliation for rows created by older app builds.
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .eq('group_id', id!)
        .maybeSingle()
      if (conversation?.id) {
        const current = (conversation.participant_ids ?? []) as string[]
        if (!current.includes(req.user_id)) {
          await supabase
            .from('conversations')
            .update({ participant_ids: [...current, req.user_id] })
            .eq('id', conversation.id)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-requests', id] })
      queryClient.invalidateQueries({ queryKey: ['group-members', id] })
    },
    onError: () => {
      Alert.alert('Could not accept request', 'Please try again in a moment.')
    },
  })

  const decline = useMutation({
    mutationFn: async (req: JoinRequest) => {
      const { error } = await supabase
        .from('co_renter_join_requests')
        .update({ status: 'declined', reviewed_by: user!.id })
        .eq('id', req.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-requests', id] })
    },
    onError: () => Alert.alert('Could not decline request', 'Please try again.'),
  })

  /** Every active member of this group, always including the caller. */
  const fetchActiveMemberIds = async (): Promise<string[]> => {
    const { data } = await supabase
      .from('co_renter_members')
      .select('user_id')
      .eq('group_id', id!)
      .eq('status', 'active')
    const ids = ((data ?? []) as { user_id: string }[]).map((m) => m.user_id)
    return [...new Set([...ids, user!.id])]
  }

  const openChat = useMutation({
    mutationFn: async () => {
      // group_id is the primary — and authoritative — link between a group and
      // its conversation: migration 032 gates group conversations on
      // `group_id IS NOT NULL AND is_group_member(...)`, and the web route
      // /api/groups/[id]/chat/init creates them with an empty participant_ids
      // for exactly that reason. So always look the row up by group_id, and
      // never let a participant_ids mismatch decide whether the chat exists.
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .eq('group_id', id!)
        .maybeSingle()

      if (existing?.id) {
        // Secondary reconciliation, kept for conversations created by older app
        // builds whose rows are still read through the participant_ids policies.
        // Best-effort: a failure here must not stop the chat from opening.
        const memberIds = await fetchActiveMemberIds()
        const current = (existing.participant_ids ?? []) as string[]
        const missing = memberIds.filter((memberId) => !current.includes(memberId))
        if (missing.length > 0) {
          await supabase
            .from('conversations')
            .update({ participant_ids: [...current, ...missing] })
            .eq('id', existing.id)
        }
        return existing.id as string
      }

      const memberIds = await fetchActiveMemberIds()
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ group_id: id!, participant_ids: memberIds })
        .select('id')
        .single()

      if (error) {
        // A unique partial index covers conversations(group_id), so a racing
        // member (or the web app) may have created the row a moment ago.
        const { data: raced } = await supabase
          .from('conversations')
          .select('id')
          .eq('group_id', id!)
          .maybeSingle()
        if (raced?.id) return raced.id as string
        throw error
      }
      return created.id as string
    },
    onSuccess: (conversationId) => {
      router.push(`/conversation/${conversationId}`)
    },
    onError: () => Alert.alert('Could not open group chat', 'Please try again.'),
  })

  const roleLabel = isAdmin ? 'Admin' : isMember ? 'Member' : null
  const alreadyRequested =
    myRequestQuery.data?.status === 'pending'

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <ChevronLeft color={colors.onSurface} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Group</Text>
        <View style={styles.headerSpacer} />
      </View>

      {groupQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groupQuery.error || !groupQuery.data ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load this group.</Text>
          <Button variant="outline" size="sm" onPress={() => groupQuery.refetch()} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.name}>{groupQuery.data.name}</Text>
          <View style={styles.metaRow}>
            {roleLabel ? <Badge variant="success">{roleLabel}</Badge> : null}
            {groupQuery.data.is_public ? <Badge variant="info">Public</Badge> : null}
          </View>
          {groupQuery.data.description ? (
            <Text style={styles.description}>{groupQuery.data.description}</Text>
          ) : null}

          {/* Actions for members */}
          {isMember ? (
            <View style={styles.actions}>
              <Button
                fullWidth
                leftIcon={<MessageCircle size={18} color={colors.onPrimary} />}
                loading={openChat.isPending}
                onPress={() => openChat.mutate()}
              >
                Group chat
              </Button>
            </View>
          ) : null}

          {/* Request to join (non-members, public groups) */}
          {!isMember && groupQuery.data.is_public ? (
            <Card style={styles.joinCard}>
              {alreadyRequested ? (
                <>
                  <Text style={styles.joinTitle}>Request pending</Text>
                  <Text style={styles.joinBody}>
                    A group admin will review your request to join.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.joinTitle}>Request to join</Text>
                  <Text style={styles.joinBody}>
                    Send a short note to the group admins (optional).
                  </Text>
                  <TextInput
                    style={styles.messageInput}
                    placeholder="Add a message"
                    placeholderTextColor={colors.outline}
                    value={requestMessage}
                    onChangeText={setRequestMessage}
                    multiline
                    maxLength={500}
                  />
                  <Button
                    fullWidth
                    loading={requestJoin.isPending}
                    onPress={() => requestJoin.mutate()}
                    style={{ marginTop: 10 }}
                  >
                    Request to join
                  </Button>
                </>
              )}
            </Card>
          ) : null}

          {/* Pending join requests (admins) */}
          {isAdmin ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending requests</Text>
              {pendingQuery.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              ) : (pendingQuery.data?.length ?? 0) === 0 ? (
                <Text style={styles.mutedText}>No pending requests.</Text>
              ) : (
                pendingQuery.data!.map((req) => (
                  <View key={req.id} style={styles.requestRow}>
                    <Avatar src={req.profile_photo} name={req.name} size={40} />
                    <View style={styles.requestMid}>
                      <Text style={styles.requestName} numberOfLines={1}>
                        {req.name ?? 'NestMatch member'}
                      </Text>
                      {req.message ? (
                        <Text style={styles.requestMessage} numberOfLines={2}>{req.message}</Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[styles.iconBtn, styles.acceptBtn]}
                      onPress={() => accept.mutate(req)}
                      disabled={accept.isPending}
                    >
                      <Check size={18} color={colors.onSecondaryContainer} />
                    </Pressable>
                    <Pressable
                      style={[styles.iconBtn, styles.declineBtn]}
                      onPress={() => decline.mutate(req)}
                      disabled={decline.isPending}
                    >
                      <X size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          ) : null}

          {/* Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members</Text>
            {membersQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (membersQuery.data?.length ?? 0) === 0 ? (
              <Text style={styles.mutedText}>
                {isMember ? 'No active members.' : 'Join this group to see its members.'}
              </Text>
            ) : (
              membersQuery.data!.map((m) => (
                <View key={m.user_id} style={styles.memberRow}>
                  <Avatar src={m.profile_photo} name={m.name} size={40} />
                  <View style={styles.memberMid}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.name ?? 'NestMatch member'}
                      {m.user_id === user?.id ? ' (you)' : ''}
                    </Text>
                    <Text style={styles.memberRole}>{m.role === 'admin' ? 'Admin' : 'Member'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Expenses — shared_expenses are not linked to groups in the schema,
              so we route to the member's own shared expenses instead. */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <Pressable style={styles.linkRow} onPress={() => router.push('/expenses')}>
              <View style={styles.rowIcon}>
                <Receipt size={18} color={colors.primary} />
              </View>
              <View style={styles.memberMid}>
                <Text style={styles.memberName}>Shared expenses</Text>
                <Text style={styles.memberRole}>View expenses you are part of</Text>
              </View>
              <ChevronRight size={18} color={colors.outline} />
            </Pressable>
          </View>

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
  name: {
    fontFamily: typography.fontFamily.display,
    fontSize: 24,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  metaRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: spacing[3],
    lineHeight: 20,
  },
  actions: { marginTop: spacing[4] },
  joinCard: { marginTop: spacing[4] },
  joinTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.primary },
  joinBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  messageInput: {
    marginTop: 10,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.onSurface,
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
  mutedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  requestMid: { flex: 1 },
  requestName: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  requestMessage: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: colors.secondaryContainer },
  declineBtn: { backgroundColor: colors.errorContainer },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  memberMid: { flex: 1 },
  memberName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 14, color: colors.primary },
  memberRole: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing[3],
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
})
