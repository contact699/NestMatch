import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a public Supabase client that doesn't require auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch active listings with basic host info
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        city,
        province,
        price,
        type,
        photos,
        newcomer_friendly,
        no_credit_history_ok,
        utilities_included,
        available_date,
        created_at,
        user_id,
        profiles!listings_user_id_fkey (
          name,
          verification_level,
          profile_photo
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching public listings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ listings: listings || [] })
  } catch (error) {
    console.error('Error in public listings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
