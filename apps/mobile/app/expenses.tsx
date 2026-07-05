import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { ChevronLeft, ExternalLink } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { Badge, Button, Card } from '@/components/ui'
import { colors, radii, spacing, typography } from '@/theme/tokens'

type BadgeVariant = 'success' | 'info' | 'warning' | 'neutral' | 'error'

function statusVariant(status: string | null): BadgeVariant {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'success'
    case 'overdue':
      return 'error'
    case 'processing':
    case 'partial':
      return 'info'
    case 'cancelled':
      return 'neutral'
    default:
      return 'warning' // pending
  }
}

type MyShare = {
  id: string
  amount: number | null
  status: string | null
  expense: {
    id: string
    title: string | null
    total_amount: number | null
    currency: string | null
    status: string | null
  } | null
}

type CreatedExpense = {
  id: string
  title: string | null
  total_amount: number | null
  currency: string | null
  status: string | null
  shares: { user_id: string; amount: number | null; status: string | null }[]
}

function formatMoney(amount: number | null, currency: string | null) {
  const value = amount != null ? Number(amount).toFixed(2) : '0.00'
  return `${currency ?? 'CAD'} $${value}`
}

export default function ExpensesScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const myShares = useQuery({
    queryKey: ['expense-my-shares', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyShare[]> => {
      const { data, error } = await supabase
        .from('expense_shares')
        .select(
          'id, amount, status, expense:shared_expenses(id, title, total_amount, currency, status)'
        )
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MyShare[]
    },
  })

  const created = useQuery({
    queryKey: ['expense-created', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CreatedExpense[]> => {
      const { data, error } = await supabase
        .from('shared_expenses')
        .select(
          'id, title, total_amount, currency, status, shares:expense_shares(user_id, amount, status)'
        )
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as CreatedExpense[]
    },
  })

  const handlePay = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://www.nestmatch.app/expenses', {
        toolbarColor: colors.primary,
        controlsColor: colors.onPrimary,
        showInRecents: true,
      })
      myShares.refetch()
      created.refetch()
    } catch {
      Alert.alert('Could not open payments', 'Please try again.')
    }
  }

  const loading = myShares.isLoading || created.isLoading
  const errored = myShares.error || created.error

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <ChevronLeft color={colors.onSurface} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Expenses</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errored ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load expenses.</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              myShares.refetch()
              created.refetch()
            }}
            style={{ marginTop: 12 }}
          >
            Retry
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>You owe</Text>
          {(myShares.data?.length ?? 0) === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>Nothing to pay</Text>
              <Text style={styles.emptyBody}>Shared expenses assigned to you appear here.</Text>
            </Card>
          ) : (
            myShares.data!.map((share) => (
              <Card key={share.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardMid}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {share.expense?.title ?? 'Shared expense'}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Your share {formatMoney(share.amount, share.expense?.currency ?? null)} of{' '}
                      {formatMoney(share.expense?.total_amount ?? null, share.expense?.currency ?? null)}
                    </Text>
                  </View>
                  <Badge variant={statusVariant(share.status)}>{share.status ?? 'pending'}</Badge>
                </View>
                {share.status !== 'paid' && share.status !== 'completed' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ExternalLink size={14} color={colors.onPrimary} />}
                    onPress={handlePay}
                    style={{ marginTop: 10, alignSelf: 'flex-start' }}
                  >
                    Pay
                  </Button>
                ) : null}
              </Card>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>You created</Text>
          {(created.data?.length ?? 0) === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>No expenses created</Text>
              <Text style={styles.emptyBody}>Expenses you set up for others show their payment status here.</Text>
            </Card>
          ) : (
            created.data!.map((exp) => {
              const shares = exp.shares ?? []
              const paid = shares.filter((s) => s.status === 'paid').length
              return (
                <Card key={exp.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardMid}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{exp.title ?? 'Expense'}</Text>
                      <Text style={styles.cardMeta}>
                        {formatMoney(exp.total_amount, exp.currency)} ·{' '}
                        {shares.length > 0 ? `${paid}/${shares.length} paid` : 'no shares'}
                      </Text>
                    </View>
                    <Badge variant={statusVariant(exp.status)}>{exp.status ?? 'pending'}</Badge>
                  </View>
                </Card>
              )
            })
          )}

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
  sectionTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing[3],
  },
  card: { marginBottom: spacing[2] },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  cardMid: { flex: 1 },
  cardTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  cardMeta: {
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
  emptyBody: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant },
})
