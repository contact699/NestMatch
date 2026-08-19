import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingsManager, type MyListing } from './listings-manager'

export const metadata = {
  title: 'My Listings',
  description: 'Manage your room listings',
}

export default async function MyListingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/my-listings')
  }

  const { data: listings } = (await supabase
    .from('listings')
    .select(
      'id, title, city, province, price, photos, available_date, views_count, is_active, newcomer_friendly, no_credit_history_ok'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })) as { data: MyListing[] | null; error: unknown }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">My Listings</h1>
          <p className="text-on-surface-variant mt-1">
            Manage your properties and roommate postings. Archive a listing to hide it from search,
            or delete it permanently.
          </p>
        </div>
      </div>

      <ListingsManager listings={listings ?? []} />
    </div>
  )
}
