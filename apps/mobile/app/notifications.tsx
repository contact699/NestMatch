import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Bell,
  UserPlus,
  Check,
  X,
  Mail,
  Users,
  MessageCircle,
} from 'lucide-react-native'
import { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui'
import { colors, spacing, typography } from '@/theme/tokens'
import type { Notification } from '@/lib/use-notifications'

function iconFor(type: string): ReactNode {
  switch (type) {
    case 'join_request_received':
      return <UserPlus size={18} color={colors.primary} />
    case 'join_request_accepted':
      return <Check size={18} color={colors.secondary} />
    case 'join_request_declined':
      return <X size={18} color={colors.error} />
    case 'invitation_received':
      return <Mail size={18} color={colors.primary} />
    case 'member_joined':
      return <Users size={18} color={colors.secondary} />
    case 'new_message':
      return <MessageCircle size={18} color={colors.primary} />
    default:
      return <Bell size={18} color={colors.primary} />
  }
}

// Map a web link to a mobile route, or null if there is no mobile equivalent.
function mobileRouteFor(link: string | null): string | null {
  if (!link) return null
  const groups = link.match(/^\/groups\/([^/?#]+)/)
  if (groups) return `/group/${groups[1]}`
  const messages = link.match(/^\/messages\/([^/?#]+)/)
  if (messages) return `/conversation/${messages[1]}`
  // Bare section links (e.g. invitation notifications link to '/groups').
  if (link.startsWith('/groups')) return '/(tabs)/groups'
  if (link.startsWith('/messages')) return '/(tabs)/messages'
  return null
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, body, link, metadata, read_at, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] })
  }

  const handlePress = async (item: Notification) => {
    if (!item.read_at) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', item.id)
      invalidate()
    }
    const route = mobileRouteFor(item.link)
    if (route) router.push(route as never)
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
    invalidate()
  }

  const hasUnread = (data ?? []).some((n) => !n.read_at)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <ChevronLeft color={colors.onSurface} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load notifications.</Text>
          <Button variant="outline" size="sm" onPress={() => refetch()} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            hasUnread ? (
              <Pressable style={styles.markAll} onPress={markAllRead} hitSlop={8}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                Group activity and messages will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.read_at && styles.rowUnread]}
              onPress={() => handlePress(item)}
            >
              <View style={styles.rowIcon}>{iconFor(item.type)}</View>
              <View style={styles.rowMid}>
                <Text style={[styles.rowTitle, !item.read_at && styles.rowTitleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.rowTime}>{relativeTime(item.created_at)}</Text>
              </View>
              {!item.read_at ? <View style={styles.dot} /> : null}
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
  markAll: { alignSelf: 'flex-end', paddingVertical: spacing[2] },
  markAllText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 12,
    color: colors.secondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 14,
    padding: spacing[3],
  },
  rowUnread: { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: { flex: 1 },
  rowTitle: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 14, color: colors.primary },
  rowTitleUnread: { fontFamily: typography.fontFamily.bodyBold },
  rowBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  rowTime: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.outline,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
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
