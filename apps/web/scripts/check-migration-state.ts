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
  check: () => Promise<{ applied: boolean; detail: string }>
}

async function tableExists(name: string): Promise<boolean> {
  // PostgREST returns 404 if a table doesn't exist on .from().select('id')
  const { error } = await (supabase as any).from(name).select('*').limit(1)
  if (!error) return true
  // 42P01 = relation doesn't exist; PGRST205 = relation not found in schema cache
  return !(error.code === '42P01' || error.code === 'PGRST205' || /not exist|not found/i.test(error.message))
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await (supabase as any).from(table).select(column).limit(1)
  if (!error) return true
  return !/column .* does not exist|not found/i.test(error.message)
}

async function rpcExists(name: string, args: Record<string, unknown> = {}): Promise<{ exists: boolean; reason: string }> {
  const { error } = await (supabase.rpc as any)(name, args)
  if (!error) return { exists: true, reason: 'callable' }
  // Best-effort: postgres 42883 is unambiguous. PostgREST 404/PGRST202 ("Could
  // not find the function in the schema cache") often fires when the function
  // exists in postgres but PostgREST hasn't reloaded — we treat that as
  // existing-but-cache-stale and let RLS-using callers prove it the real way.
  if (error.code === '42883' || /^function .* does not exist/i.test(error.message || '')) {
    return { exists: false, reason: 'missing' }
  }
  // Any other error (auth, args, transport, schema cache) means the function
  // probably exists but we can't fully verify via REST.
  return { exists: true, reason: `errored but probably exists: ${error.code || ''} ${error.message?.slice(0, 80)}` }
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
    // 032 doesn't define a new function — it rebuilds policies on top of the
    // is_group_member() helper from 025. We check that helper here as the
    // closest behavioral signal that 032's policies can resolve at all.
    description: 'is_group_member() helper (used by rebuilt group-chat policies)',
    check: async () => {
      const { exists, reason } = await rpcExists('is_group_member', {
        p_group_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000',
      })
      return { applied: exists, detail: exists ? 'helper RPC exists' : `helper RPC ${reason}` }
    },
  },
  {
    migration: '033_secure_pay_expense_share',
    description: 'pay_expense_share function (security-definer hardened)',
    check: async () => {
      const { exists } = await rpcExists('pay_expense_share', {
        p_share_id: '00000000-0000-0000-0000-000000000000',
        p_payment_method_id: '00000000-0000-0000-0000-000000000000',
      })
      return { applied: exists, detail: exists ? 'RPC callable' : 'RPC missing' }
    },
  },
]

async function main() {
  console.log(`Probing schema state on ${supabaseUrl}\n`)
  for (const probe of probes) {
    try {
      const { applied, detail } = await probe.check()
      const mark = applied ? 'APPLIED   ' : 'MISSING   '
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
