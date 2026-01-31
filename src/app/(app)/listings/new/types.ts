import { z } from 'zod'

export const listingSchema = z.object({
  type: z.enum(['room', 'shared_room', 'entire_place']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().max(2000).optional(),
  price: z.number().min(100, 'Price must be at least $100').max(50000),
  utilities_included: z.boolean(),
  available_date: z.string().min(1, 'Available date is required'),
  minimum_stay: z.number().min(1).max(24),
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().optional(),
  photos: z.array(z.string()),
  amenities: z.array(z.string()),
  bathroom_type: z.enum(['ensuite', 'private', 'shared']),
  bathroom_size: z.enum(['full', 'three_quarter', 'half']).optional().nullable(),
  roommate_gender_preference: z.enum(['male', 'female', 'any']).optional(),
  roommate_age_min: z.number().min(18).optional(),
  roommate_age_max: z.number().max(120).optional(),
  newcomer_friendly: z.boolean(),
  no_credit_history_ok: z.boolean(),
})

export type ListingFormData = z.infer<typeof listingSchema>
