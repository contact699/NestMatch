import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: tsx scripts/inspect-verifications.ts <user_id>')
    process.exit(1)
  }

  const { data, error } = await supabase
    .from('verifications')
    .select('id, type, status, provider, external_id, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log(`Verifications for ${userId} (${data?.length ?? 0}):`)
  for (const v of data ?? []) {
    console.log(`  ${v.created_at}  ${v.type.padEnd(10)} ${v.status.padEnd(10)} ${v.provider}  case=${v.external_id}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_level, verified_at, stripe_customer_id, email, name')
    .eq('user_id', userId)
    .single()

  console.log('\nProfile:')
  console.log(profile)
}

main().catch((e) => { console.error(e); process.exit(1) })
