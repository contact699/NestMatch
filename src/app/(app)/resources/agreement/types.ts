import { z } from 'zod'

export const agreementSchema = z.object({
  // Step 1: Basics
  province: z.string().min(1, 'Province is required'),
  address: z.string().min(5, 'Address is required').max(200),
  moveInDate: z.string().min(1, 'Move-in date is required'),
  roommateNames: z.array(z.string()).min(1, 'At least one roommate name is required'),

  // Step 2: Financial
  totalRent: z.number().min(1, 'Total rent is required'),
  rentSplitMethod: z.enum(['equal', 'custom']),
  rentSplits: z.array(z.object({
    name: z.string(),
    amount: z.number(),
  })),
  rentDueDate: z.number().min(1).max(31),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  securityDeposit: z.number().optional(),
  utilitiesIncluded: z.boolean(),
  utilitiesSplit: z.enum(['equal', 'usage', 'rotation']).optional(),

  // Step 3: Lifestyle
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  guestPolicy: z.enum(['notify', 'limit', 'approval', 'flexible']),
  overnightGuestLimit: z.number().optional(),
  smokingPolicy: z.enum(['no_smoking', 'outside_only', 'designated_area']),
  cannabisPolicy: z.enum(['no_cannabis', 'outside_only', 'designated_area', 'same_as_smoking']),
  petsAllowed: z.boolean(),
  petDetails: z.string().optional(),

  // Step 4: Responsibilities
  cleaningSchedule: z.enum(['rotating', 'assigned', 'as_needed', 'hired']),
  cleaningAreas: z.array(z.object({
    area: z.string(),
    assignedTo: z.string().optional(),
  })).optional(),
  sharedSuppliesApproach: z.enum(['split', 'rotate', 'individual']),
  maintenanceReporting: z.string().optional(),

  // Step 5: Agreement Terms
  noticeToLeave: z.number().min(1),
  disputeResolution: z.enum(['direct', 'written', 'mediation']),
  agreementDuration: z.enum(['month_to_month', 'fixed_term']),
  fixedTermEndDate: z.string().optional(),
})

export type AgreementFormData = z.infer<typeof agreementSchema>

export const defaultValues: Partial<AgreementFormData> = {
  province: '',
  address: '',
  moveInDate: '',
  roommateNames: [''],
  totalRent: 0,
  rentSplitMethod: 'equal',
  rentSplits: [],
  rentDueDate: 1,
  paymentMethod: 'e-transfer',
  securityDeposit: 0,
  utilitiesIncluded: false,
  utilitiesSplit: 'equal',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  guestPolicy: 'notify',
  overnightGuestLimit: 3,
  smokingPolicy: 'no_smoking',
  cannabisPolicy: 'same_as_smoking',
  petsAllowed: false,
  petDetails: '',
  cleaningSchedule: 'rotating',
  cleaningAreas: [],
  sharedSuppliesApproach: 'split',
  maintenanceReporting: '',
  noticeToLeave: 30,
  disputeResolution: 'direct',
  agreementDuration: 'month_to_month',
  fixedTermEndDate: '',
}
