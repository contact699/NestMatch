// One-off script: poll Certn for every pending verification and apply the same
// update the webhook handler would have, in case Certn never sent (or we
// dropped) the CASE_STATUS_CHANGED event. Safe to re-run; only touches rows
// whose Certn case is no longer in a pending status.
//
// Run from apps/web: `npx tsx scripts/sync-pending-verifications.ts`
// Optional: pass --user <user_id> to limit to one user.

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { getCaseStatus, mapCertnStatus } from '../src/lib/services/certn'
import type { Database } from '../src/types/database'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const argUser = process.argv.indexOf('--user')
const userFilter = argUser !== -1 ? process.argv[argUser + 1] : undefined

async function main() {
  let query = supabase
    .from('verifications')
    .select('id, user_id, type, status, external_id, created_at')
    .eq('provider', 'certn')
    .eq('status', 'pending')

  if (userFilter) {
    query = query.eq('user_id', userFilter)
  }

  const { data: pendings, error } = await query

  if (error) {
    console.error('Failed to load pending verifications:', error.message)
    process.exit(1)
  }

  if (!pendings || pendings.length === 0) {
    console.log('No pending verifications to sync.')
    return
  }

  console.log(`Found ${pendings.length} pending verification(s).`)

  for (const v of pendings) {
    if (!v.external_id) {
      console.log(`- skip ${v.id} (no external_id)`)
      continue
    }

    const result = await getCaseStatus(v.external_id)
    if (!result.success || !result.case) {
      console.log(`- ${v.id} (case ${v.external_id}): fetch failed — ${result.error}`)
      continue
    }

    const newStatus = mapCertnStatus(result.case.overall_status)
    console.log(`- ${v.id} (case ${v.external_id}, type ${v.type}): certn=${result.case.overall_status} → ${newStatus}`)

    if (newStatus === 'pending') continue

    const update = {
      status: newStatus,
      result: JSON.parse(JSON.stringify(result.case)),
      completed_at: new Date().toISOString(),
      expires_at:
        newStatus === 'completed'
          ? new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          : undefined,
    }

    const { error: updateError } = await supabase
      .from('verifications')
      .update(update)
      .eq('id', v.id)

    if (updateError) {
      console.log(`  ! update failed: ${updateError.message}`)
      continue
    }

    console.log(`  ✓ updated`)

    if (newStatus === 'completed') {
      // Mirror the webhook's verification_level recompute
      const { data: completed } = await supabase
        .from('verifications')
        .select('type')
        .eq('user_id', v.user_id)
        .eq('provider', 'certn')
        .eq('status', 'completed')

      const types = new Set((completed ?? []).map((r) => r.type))
      const hasId = types.has('id')
      const hasOther = ['criminal', 'credit', 'reference'].some((t) => types.has(t))
      const level = hasId && hasOther ? 'trusted' : 'verified'

      await supabase
        .from('profiles')
        .update({ verification_level: level, verified_at: new Date().toISOString() })
        .eq('user_id', v.user_id)

      console.log(`  ↑ profile verification_level set to "${level}"`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
