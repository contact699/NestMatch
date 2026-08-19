import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditListingForm, type EditableListing } from './edit-listing-form'

export const metadata = {
  title: 'Edit Listing',
  robots: { index: false, follow: false },
}

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/listings/${id}/edit`)
  }

  const { data: listing, error } = (await supabase
    .from('listings')
    .select(
      'id, user_id, type, title, description, price, utilities_included, available_date, minimum_stay, address, city, province, postal_code, photos, amenities, roommate_gender_preference, roommate_age_min, roommate_age_max, newcomer_friendly, no_credit_history_ok, is_active'
    )
    .eq('id', id)
    .maybeSingle()) as { data: (EditableListing & { user_id: string }) | null; error: unknown }

  // A transient DB failure must surface as an error, not a 404 — a 404 here
  // reads as "my listing was deleted" to the owner.
  if (error) {
    throw new Error('Failed to load listing for editing')
  }

  if (!listing) {
    notFound()
  }

  if (listing.user_id !== user.id) {
    redirect(`/listings/${id}`)
  }

  return <EditListingForm listing={listing} />
}
