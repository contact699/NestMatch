import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createBookingSchema = z.object({
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  details: z.object({
    address: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.string()).optional(),
  }).optional(),
})

const updateBookingSchema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(['confirmed', 'completed', 'cancelled']),
  total_amount: z.number().positive().optional(),
})

// Get bookings for a service provider
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: providerId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role') // 'provider' or 'customer'

    // Check if user is the provider
    const { data: provider } = await (supabase as any)
      .from('service_providers')
      .select('user_id')
      .eq('id', providerId)
      .single() as { data: any }

    const isProvider = provider?.user_id === user.id

    let query = (supabase as any)
      .from('service_bookings')
      .select(`
        *,
        provider:service_providers(
          id,
          business_name,
          service_type,
          user:profiles(
            name,
            profile_photo
          )
        ),
        customer:profiles(
          user_id,
          name,
          profile_photo,
          email,
          phone
        )
      `)
      .eq('provider_id', providerId)

    // Filter by role if specified
    if (role === 'customer') {
      query = query.eq('customer_id', user.id)
    } else if (role === 'provider' && isProvider) {
      // Provider sees all their bookings
    } else {
      // Default: only show user's own bookings
      query = query.eq('customer_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('service_date', { ascending: true })

    const { data: bookings, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ bookings: bookings || [] })
  } catch (error) {
    console.error('Error in GET /api/services/[id]/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a booking
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: providerId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify provider exists and is active
    const { data: provider } = await (supabase as any)
      .from('service_providers')
      .select('id, is_active, user_id')
      .eq('id', providerId)
      .single() as { data: any }

    if (!provider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      )
    }

    if (!provider.is_active) {
      return NextResponse.json(
        { error: 'This service provider is not currently accepting bookings' },
        { status: 400 }
      )
    }

    // Cannot book your own service
    if (provider.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot book your own service' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createBookingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { service_date, details } = validationResult.data

    // Create booking
    const { data: booking, error: createError } = await (supabase as any)
      .from('service_bookings')
      .insert({
        provider_id: providerId,
        customer_id: user.id,
        service_date,
        details,
        status: 'requested',
      })
      .select(`
        *,
        provider:service_providers(
          business_name,
          service_type
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating booking:', createError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // TODO: Send notification to provider

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/services/[id]/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update booking status (provider only, or customer for cancellation)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: providerId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = updateBookingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { booking_id, status, total_amount } = validationResult.data

    // Get booking
    const { data: booking } = await (supabase as any)
      .from('service_bookings')
      .select(`
        *,
        provider:service_providers(user_id)
      `)
      .eq('id', booking_id)
      .eq('provider_id', providerId)
      .single() as { data: any }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const isProvider = booking.provider?.user_id === user.id
    const isCustomer = booking.customer_id === user.id

    // Check permissions
    if (status === 'cancelled') {
      // Both can cancel
      if (!isProvider && !isCustomer) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    } else {
      // Only provider can confirm/complete
      if (!isProvider) {
        return NextResponse.json(
          { error: 'Only the service provider can update booking status' },
          { status: 403 }
        )
      }
    }

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (total_amount !== undefined && isProvider) {
      updateData.total_amount = total_amount
    }

    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from('service_bookings')
      .update(updateData)
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      )
    }

    return NextResponse.json({ booking: updatedBooking })
  } catch (error) {
    console.error('Error in PUT /api/services/[id]/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
