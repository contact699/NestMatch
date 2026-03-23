import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <main className="relative z-0">{children}</main>
    </div>
  )
}
