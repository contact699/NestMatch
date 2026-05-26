/**
 * Read-only diagnostic: figure out which of the local supabase/migrations
 * have actually been applied to the remote DB.
 *
 * The supabase CLI shows our local 006-033 as "Local | (blank)" because the
 * remote schema_migrations table tracks different timestamps. This probes
 * the actual schema for tell-tale objects each migration introduces.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function rpc<T = unknown>(sql: string): Promise<T | null> {
  // We don't have a generic exec_sql RPC, so we probe via PostgREST queries
  // on information_schema and pg_catalog directly. PostgREST exposes these
  // via the `pg_meta` schema in some setups — but here we'll just attempt
  // direct SELECTs through the supabase-js client where possible, and use
  // RPC only when needed. Returning null on missing.
  void sql
  return null
}
void rpc

interface Probe {
  migration: string
  description: string
  check: () => Promise<{ applied: boolean | null; detail: string }>
}

interface ProbeError {
  code?: string
  message?: string
}

interface RestProbeClient {
  from(name: string): {
    select(columns: string): {
      limit(count: number): Promise<{ error: ProbeError | null }>
    }
  }
  rpc(name: string, args: Record<string, unknown>): Promise<{ error: ProbeError | null }>
}

const probeClient = supabase as unknown as RestProbeClient

async function tableExists(name: string): Promise<boolean> {
  // PostgREST returns 404 if a table doesn't exist on .from().select('id')
  const { error } = await probeClient.from(name).select('*').limit(1)
  if (!error) return true
  // 42P01 = relation doesn't exist; PGRST205 = relation not found in schema cache
  return !(error.code === '42P01' || error.code === 'PGRST205' || /not exist|not found/i.test(error.message))
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await probeClient.from(table).select(column).limit(1)
  if (!error) return true
  return !/column .* does not exist|not found/i.test(error.message)
}

async function rpcExists(name: string, args: Record<string, unknown> = {}): Promise<{ exists: boolean; reason: string }> {
  const { error } = await probeClient.rpc(name, args)
  if (!error) return { exists: true, reason: 'callable' }
  // 42883 = function does not exist
  if (error.code === '42883' || /function .* does not exist/i.test(error.message)) {
    return { exists: false, reason: 'missing' }
  }
  // Any other error (auth, args) means the function exists
  return { exists: true, reason: `errored but exists: ${error.message?.slice(0, 80)}` }
}

const probes: Probe[] = [
  {
    migration: '022_fix_expense_rls_recursion',
    description: 'expense_shares RLS using helper function',
    check: async () => {
      const { exists } = await rpcExists('user_can_see_expense', { p_expense_id: '00000000-0000-0000-0000-000000000000' })
      return { applied: exists, detail: exists ? 'helper RPC user_can_see_expense exists' : 'helper RPC missing' }
    },
  },
  {
    migration: '023_increment_listing_views',
    description: 'increment_listing_views RPC',
    check: async () => {
      const { exists } = await rpcExists('increment_listing_views', { p_listing_id: '00000000-0000-0000-0000-000000000000' })
      return { applied: exists, detail: exists ? 'RPC callable' : 'RPC missing' }
    },
  },
  {
    migration: '024_saved_profiles',
    description: 'saved_profiles table',
    check: async () => {
      const ok = await tableExists('saved_profiles')
      return { applied: ok, detail: ok ? 'table exists' : 'table missing' }
    },
  },
  {
    migration: '025_group_saved_listings',
    description: 'group_saved_listings table + get_my_active_groups RPC',
    check: async () => {
      const tableOk = await tableExists('group_saved_listings')
      const { exists: rpcOk } = await rpcExists('get_my_active_groups')
      const applied = tableOk && rpcOk
      return { applied, detail: `table=${tableOk} rpc=${rpcOk}` }
    },
  },
  {
    migration: '027_group_chat',
    description: 'conversations.group_id + co_renter_members.last_read_at columns',
    check: async () => {
      const groupCol = await columnExists('conversations', 'group_id')
      const lastReadCol = await columnExists('co_renter_members', 'last_read_at')
      const applied = groupCol && lastReadCol
      return { applied, detail: `conversations.group_id=${groupCol} co_renter_members.last_read_at=${lastReadCol}` }
    },
  },
  {
    migration: '028_group_chat_email_cooldown',
    description: 'co_renter_members.last_chat_email_at column',
    check: async () => {
      const ok = await columnExists('co_renter_members', 'last_chat_email_at')
      return { applied: ok, detail: ok ? 'column exists' : 'column missing' }
    },
  },
  {
    migration: '030_harden_expense_rls',
    description: 'group_member_of helper function',
    check: async () => {
      const { exists } = await rpcExists('group_member_of', { p_group_id: '00000000-0000-0000-0000-000000000000' })
      return { applied: exists, detail: exists ? 'helper RPC exists' : 'helper RPC missing' }
    },
  },
  {
    migration: '031_add_profile_budget',
    description: 'profiles.budget_min / budget_max columns',
    check: async () => {
      const minOk = await columnExists('profiles', 'budget_min')
      const maxOk = await columnExists('profiles', 'budget_max')
      const applied = minOk && maxOk
      return { applied, detail: `budget_min=${minOk} budget_max=${maxOk}` }
    },
  },
  {
    migration: '032_scope_chat_policies_and_use_helper',
    description: 'chat RLS policies rebuilt on is_group_member()',
    check: async () => {
      // Migration 032 rebuilds policies; it does not create a new
      // table/column/RPC. This REST-only probe cannot inspect pg_policies, so
      // do not report a false APPLIED result here.
      const { exists, reason } = await rpcExists('is_group_member', {
        p_group_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000',
      })
      return {
        applied: null,
        detail: exists
          ? 'helper RPC exists; verify policies via pg_policies or a browser chat smoke test'
          : `helper RPC ${reason}`,
      }
    },
  },
  {
    migration: '033_secure_pay_expense_share',
    description: 'pay_expense_share function (security-definer hardened)',
    check: async () => {
      const { exists, reason } = await rpcExists('pay_expense_share', {
        p_expense_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000',
      })
      return { applied: exists, detail: exists ? `RPC exists (${reason})` : 'RPC missing' }
    },
  },
]

async function main() {
  console.log(`Probing schema state on ${supabaseUrl}\n`)
  for (const probe of probes) {
    try {
      const { applied, detail } = await probe.check()
      const mark = applied === null ? 'UNKNOWN   ' : applied ? 'APPLIED   ' : 'MISSING   '
      console.log(`${mark} ${probe.migration}  — ${probe.description}\n             ${detail}`)
    } catch (err) {
      console.log(`ERROR     ${probe.migration}  — ${probe.description}\n             ${(err as Error).message}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
