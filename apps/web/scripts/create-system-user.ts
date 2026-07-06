// Creates (or finds) the platform system user used as reporter_id for
// auto-filed listing-fraud reports. Run from apps/web with tsx.
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
  if (m) env[m[1]] = m[2]
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'system@nestmatch.app'

async function main() {
  // Look for an existing system user first.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users.find((u) => u.email === EMAIL)
  if (existing) {
    console.log(`exists: ${existing.id}`)
    return
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    password: randomBytes(24).toString('base64url'),
    user_metadata: { name: 'NestMatch System' },
  })
  if (error) throw error
  console.log(`created: ${data.user.id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
