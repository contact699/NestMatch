// Verification check and package pricing configuration
// Prices in CAD cents

export type VerificationCheckType = 'id' | 'criminal' | 'credit'
export type VerificationPackageType = 'standard' | 'complete'
export type VerificationProductType = VerificationCheckType | VerificationPackageType

export interface VerificationProduct {
  name: string
  price: number // cents
  description: string
}

export interface VerificationPackage extends VerificationProduct {
  includes: VerificationCheckType[]
  savings: number // cents
}

export const VERIFICATION_CHECKS: Record<VerificationCheckType, VerificationProduct> = {
  id: { name: 'ID Verification', price: 1500, description: 'Government-issued ID verification' },
  criminal: { name: 'Background Check', price: 2500, description: 'Criminal, fraud, and sanctions screening' },
  credit: { name: 'Credit Check', price: 3000, description: 'Canadian credit report via Equifax' },
}

export const VERIFICATION_PACKAGES: Record<VerificationPackageType, VerificationPackage> = {
  standard: {
    name: 'Standard Package',
    price: 3500,
    description: 'ID verification + background check',
    includes: ['id', 'criminal'],
    savings: 500,
  },
  complete: {
    name: 'Complete Package',
    price: 5500,
    description: 'All three verifications',
    includes: ['id', 'criminal', 'credit'],
    savings: 1500,
  },
}

export function isCheckType(type: string): type is VerificationCheckType {
  return type in VERIFICATION_CHECKS
}

export function isPackageType(type: string): type is VerificationPackageType {
  return type in VERIFICATION_PACKAGES
}

export function getProduct(type: VerificationProductType): VerificationProduct | null {
  if (isCheckType(type)) return VERIFICATION_CHECKS[type]
  if (isPackageType(type)) return VERIFICATION_PACKAGES[type]
  return null
}

/**
 * Get the CERTN check types to initiate for a product.
 *
 * Note: The criminal CERTN case already includes IDENTITY_VERIFICATION_1
 * as a waterfall dependency. When criminal is in the list, we skip standalone
 * id to avoid a redundant CERTN case. The criminal case's webhook handler
 * derives an id verification row on completion.
 */
export function getCheckTypes(type: VerificationProductType): VerificationCheckType[] {
  if (isCheckType(type)) return [type]
  if (isPackageType(type)) {
    const checks = [...VERIFICATION_PACKAGES[type].includes]
    // Criminal already bundles identity — don't order a redundant standalone ID case
    if (checks.includes('criminal')) {
      return checks.filter(c => c !== 'id')
    }
    return checks
  }
  return []
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}
