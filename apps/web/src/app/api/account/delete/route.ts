import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Storage buckets that hold user-uploaded files. Uploads are namespaced by
 * `${userId}/` (see `api/upload/route.ts`), so everything under that prefix
 * belongs to the account being deleted.
 */
const USER_BUCKETS = ['listing-photos', 'profile-photos', 'chat-attachments', 'avatars'] as const

/** Postgres "column does not exist" — tolerated when a migration hasn't shipped. */
const UNDEFINED_COLUMN = '42703'

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Most user-owned rows cascade away automatically: every table either
 * references `auth.users(id) ON DELETE CASCADE` or `profiles(user_id) ON DELETE
 * CASCADE` (and `profiles.user_id` itself cascades off `auth.users`). Three
 * columns are declared with no ON DELETE action, so they would block the
 * delete with a foreign-key violation — null them out first.
 */
async function clearBlockingReferences(
  service: ServiceClient,
  userId: string,
  requestId: string,
): Promise<void> {
  // verifications.paid_by -> auth.users(id), NO ACTION (migration 015)
  const { error: paidByError } = await service
    .from('verifications')
    .update({ paid_by: null })
    .eq('paid_by', userId)
  if (paidByError) throw paidByError

  // abuse_events.resolved_by -> profiles(user_id), NO ACTION (migration 010b)
  const { error: resolvedByError } = await service
    .from('abuse_events')
    .update({ resolved_by: null })
    .eq('resolved_by', userId)
  if (resolvedByError) throw resolvedByError

  // messages.deleted_by -> profiles(user_id), NO ACTION (migration 010b).
  // The column is absent from the generated Database type, so this is untyped;
  // a missing column just means the migration hasn't been applied here.
  const { error: deletedByError } = await (service.from('messages') as any)
    .update({ deleted_by: null })
    .eq('deleted_by', userId)
  if (deletedByError && deletedByError.code !== UNDEFINED_COLUMN) throw deletedByError
  if (deletedByError) {
    logger.warn('messages.deleted_by column absent — skipping', { requestId })
  }
}

/**
 * `conversations.participant_ids` is a plain `uuid[]` with no foreign key, so
 * nothing removes the departing user from it. Detach them from every thread.
 *
 * CONVERSATION ROWS ARE NEVER DELETED. `messages.conversation_id` references
 * `conversations(id) ON DELETE CASCADE` (001:141), so dropping a 1:1 thread — as
 * this function used to do once the departing user was its second-to-last
 * participant — took the SURVIVING participant's messages with it. One person
 * closing their account is not consent to erase the other person's copy of the
 * conversation.
 *
 * What the departing user is entitled to remove is their own contributions, and
 * those go anyway: `messages.sender_id` references `auth.users(id) ON DELETE
 * CASCADE` (001:142), so `auth.admin.deleteUser` at the end of this route
 * removes every message they sent. The explicit delete below is belt-and-braces
 * for the case where the auth delete fails partway (the profile is already gone
 * by then, so the account is unreachable but the rows would linger) — it is a
 * single indexed delete, so it costs effectively nothing.
 */
async function detachFromConversations(
  service: ServiceClient,
  userId: string,
): Promise<void> {
  const { data: conversations, error } = await service
    .from('conversations')
    .select('id, participant_ids, group_id')
    .contains('participant_ids', [userId])
  if (error) throw error

  for (const conversation of conversations ?? []) {
    const remaining = (conversation.participant_ids ?? []).filter((id) => id !== userId)

    const { error: updateError } = await service
      .from('conversations')
      .update({ participant_ids: remaining })
      .eq('id', conversation.id)
    if (updateError) throw updateError
  }
}

/**
 * Remove the departing user's own messages, leaving every other participant's
 * intact. See the note on `detachFromConversations`: `messages.sender_id`
 * already cascades off `auth.users`, so this is redundant on the happy path and
 * exists to keep the scrub complete when the auth delete fails.
 */
async function deleteOwnMessages(
  service: ServiceClient,
  userId: string,
  requestId: string,
): Promise<void> {
  const { error } = await service.from('messages').delete().eq('sender_id', userId)
  if (error) {
    // Non-fatal: the auth-user delete below cascades these rows away anyway.
    logger.warn('Failed to delete own messages during account deletion', {
      requestId,
      error: error.message,
    })
  }
}

/**
 * Best-effort removal of the account's uploaded files. A storage failure must
 * not block the account deletion itself, so failures are logged, not thrown.
 */
async function purgeStorage(
  service: ServiceClient,
  userId: string,
  requestId: string,
): Promise<void> {
  for (const bucket of USER_BUCKETS) {
    try {
      const { data: files, error } = await service.storage.from(bucket).list(userId, { limit: 1000 })
      if (error) throw error
      if (!files?.length) continue

      const paths = files.map((file) => `${userId}/${file.name}`)
      const { error: removeError } = await service.storage.from(bucket).remove(paths)
      if (removeError) throw removeError
    } catch (error) {
      logger.warn('Failed to purge storage bucket during account deletion', {
        requestId,
        bucket,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/**
 * POST /api/account/delete
 *
 * Permanently deletes the authenticated caller's account: their data rows,
 * uploaded files, and the Supabase auth user. Takes no body — an account can
 * only ever delete itself. Returns `{ deleted: true }` on success.
 */
export const POST = withApiHandler(
  async (_req, { userId, requestId }) => {
    const uid = userId!
    const service = createServiceClient()

    // Log the INTENT before anything is destroyed. The wrapper's audit hook runs
    // after the response, by which point `profiles` — the actor FK target of
    // `audit_logs.actor_id` (010b:124) — no longer holds this user, so the row
    // would either be nulled out or silently dropped. `audit` is therefore
    // deliberately absent from this route's config; this line is the record.
    logger.info('Account deletion requested', {
      requestId,
      userId: uid,
      action: 'delete',
      resource: 'account',
      requestedAt: new Date().toISOString(),
    })

    await clearBlockingReferences(service, uid, requestId)
    await detachFromConversations(service, uid)
    await deleteOwnMessages(service, uid, requestId)
    await purgeStorage(service, uid, requestId)

    // Explicit profile delete (cascades payments, groups, expenses, saved
    // items, notifications, …) so the account is scrubbed even if the auth
    // delete below fails partway.
    const { error: profileError } = await service.from('profiles').delete().eq('user_id', uid)
    if (profileError) throw profileError

    const { error: authError } = await service.auth.admin.deleteUser(uid)
    if (authError) {
      logger.error(
        'Failed to delete auth user during account deletion',
        authError instanceof Error ? authError : new Error(String(authError)),
        { requestId, userId: uid },
      )
      throw new Error('Failed to delete account')
    }

    logger.info('Account deleted', { requestId, userId: uid })

    return apiResponse({ deleted: true }, 200, requestId)
  },
  {
    rateLimit: 'default',
    // No `audit` block on purpose — see the logger.info above. The wrapper
    // writes its audit row after the handler returns, when `profiles` (the
    // actor FK) no longer contains this user.
  },
)
