// One-off: mark a single verification row as failed (used when the Certn case
// reported APPLICANT_EXPIRED — terminal, not retryable on that case).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('Usage: tsx scripts/mark-stale-verification-failed.ts <verification_id>')
    process.exit(1)
  }

  const { data, error } = await supabase
    .from('verifications')
    .update({ status: 'failed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log('Updated:', data)
}

main().catch((e) => { console.error(e); process.exit(1) })
