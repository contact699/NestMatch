/**
 * Shared listing mutations used by both the My Listings manager and the
 * listing edit form, so the delete/archive flows hit the same endpoint and
 * surface errors identically instead of being duplicated per page.
 */

async function listingRequest(listingId: string, init: RequestInit): Promise<void> {
  const response = await fetch(`/api/listings/${listingId}`, init)

  if (!response.ok) {
    let message = 'Something went wrong'
    try {
      const result = (await response.json()) as { error?: string }
      if (typeof result?.error === 'string' && result.error) {
        message = result.error
      }
    } catch {
      // Non-JSON error body — fall back to the generic message.
    }
    throw new Error(message)
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  await listingRequest(listingId, { method: 'DELETE' })
}

export async function setListingActive(listingId: string, isActive: boolean): Promise<void> {
  await listingRequest(listingId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  })
}
