import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

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
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id: providerId } = params

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role') // 'provider' or 'customer'

    // Check if user is the provider
    const { data: provider } = await (supabase as any)
      .from('service_providers')
      .select('user_id')
      .eq('id', providerId)
      .single()

    const isProvider = provider?.user_id === userId

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
      query = query.eq('customer_id', userId)
    } else if (role === 'provider' && isProvider) {
      // Provider sees all their bookings
    } else {
      // Default: only show user's own bookings
      query = query.eq('customer_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('service_date', { ascending: true })

    const { data: bookings, error } = await query

    if (error) throw error

    return apiResponse({ bookings: bookings || [] }, 200, requestId)
  }
)

// Create a booking
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id: providerId } = params

    // Verify provider exists and is active
    const { data: provider } = await (supabase as any)
      .from('service_providers')
      .select('id, is_active, user_id')
      .eq('id', providerId)
      .single()

    if (!provider) {
      throw new NotFoundError('Service provider not found')
    }

    if (!provider.is_active) {
      throw new ValidationError('This service provider is not currently accepting bookings')
    }

    // Cannot book your own service
    if (provider.user_id === userId) {
      throw new ValidationError('You cannot book your own service')
    }

    // Validate input
    let body: z.infer<typeof createBookingSchema>
    try {
      body = await parseBody(req, createBookingSchema)
    } catch {
      throw new ValidationError('Invalid booking data')
    }

    const { service_date, details } = body

    // Create booking
    const { data: booking, error: createError } = await (supabase as any)
      .from('service_bookings')
      .insert({
        provider_id: providerId,
        customer_id: userId,
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

    if (createError) throw createError

    return apiResponse({ booking }, 201, requestId)
  },
  {
    audit: {
      action: 'create',
      resourceType: 'service_booking',
      getResourceId: (_req, res) => res?.booking?.id,
    },
  }
)

// Update booking status (provider only, or customer for cancellation)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id: providerId } = params

    // Validate input
    let body: z.infer<typeof updateBookingSchema>
    try {
      body = await parseBody(req, updateBookingSchema)
    } catch {
      throw new ValidationError('Invalid booking update data')
    }

    const { booking_id, status, total_amount } = body

    // Get booking
    const { data: booking } = await (supabase as any)
      .from('service_bookings')
      .select(`
        *,
        provider:service_providers(user_id)
      `)
      .eq('id', booking_id)
      .eq('provider_id', providerId)
      .single()

    if (!booking) {
      throw new NotFoundError('Booking not found')
    }

    const isProvider = booking.provider?.user_id === userId
    const isCustomer = booking.customer_id === userId

    // Check permissions
    if (status === 'cancelled') {
      // Both can cancel
      if (!isProvider && !isCustomer) {
        throw new AuthorizationError('Access denied')
      }
    } else {
      // Only provider can confirm/complete
      if (!isProvider) {
        throw new AuthorizationError('Only the service provider can update booking status')
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

    if (updateError) throw updateError

    return apiResponse({ booking: updatedBooking }, 200, requestId)
  },
  {
    audit: {
      action: 'update',
      resourceType: 'service_booking',
    },
  }
)
