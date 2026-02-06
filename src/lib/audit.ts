import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'soft_delete'
  | 'restore'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'email_change'
  | 'verification_start'
  | 'verification_complete'
  | 'export_data'
  | 'admin_action'
  | 'api_access'
  | 'dismiss'

export type ActorType = 'user' | 'admin' | 'system' | 'webhook'

export interface AuditLogEntry {
  actorId?: string
  actorType: ActorType
  action: AuditAction
  resourceType: string
  resourceId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  requestId?: string
}

export interface SecurityEventEntry {
  userId?: string
  eventType: string
  riskScore?: number
  details?: Record<string, any>
}

/**
 * Get request context for audit logs
 */
async function getRequestContext(): Promise<{
  ipAddress: string
  userAgent: string
  requestId: string
}> {
  try {
    const headersList = await headers()
    return {
      ipAddress: headersList.get('x-forwarded-for')?.split(',')[0] ||
                 headersList.get('x-real-ip') ||
                 'unknown',
      userAgent: headersList.get('user-agent') || 'unknown',
      requestId: headersList.get('x-request-id') ||
                 `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    }
  } catch {
    return {
      ipAddress: 'unknown',
      userAgent: 'unknown',
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    }
  }
}

/**
 * Log an audit event
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceClient()
    const context = await getRequestContext()

    await supabase.from('audit_logs').insert({
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      old_values: entry.oldValues,
      new_values: entry.newValues,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      request_id: entry.requestId || context.requestId,
      metadata: entry.metadata,
    })
  } catch (error) {
    // Log to console but don't fail the request
    console.error('Audit log error:', error)
  }
}

/**
 * Log a security event
 */
export async function securityLog(entry: SecurityEventEntry): Promise<void> {
  try {
    const supabase = createServiceClient()
    const context = await getRequestContext()

    await supabase.from('security_events').insert({
      user_id: entry.userId,
      event_type: entry.eventType,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      risk_score: entry.riskScore || 0,
      details: entry.details,
    })
  } catch (error) {
    console.error('Security log error:', error)
  }
}

/**
 * Helper for admin actions
 */
export async function auditAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
): Promise<void> {
  await auditLog({
    actorId: adminId,
    actorType: 'admin',
    action: 'admin_action',
    resourceType,
    resourceId,
    metadata: { adminAction: action, ...details },
  })
}

/**
 * Helper for data changes
 */
export async function auditDataChange(
  userId: string,
  action: 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): Promise<void> {
  await auditLog({
    actorId: userId,
    actorType: 'user',
    action,
    resourceType,
    resourceId,
    oldValues,
    newValues,
  })
}

/**
 * Helper for authentication events
 */
export async function auditAuth(
  userId: string | undefined,
  success: boolean,
  method: 'password' | 'oauth' | 'magic_link',
  details?: Record<string, any>
): Promise<void> {
  const eventType = success ? 'login_success' : 'login_failed'

  await securityLog({
    userId,
    eventType,
    riskScore: success ? 0 : 30,
    details: { method, ...details },
  })

  if (userId && success) {
    await auditLog({
      actorId: userId,
      actorType: 'user',
      action: 'login',
      resourceType: 'session',
      resourceId: userId,
      metadata: { method },
    })
  }
}

/**
 * Calculate risk score based on various factors
 */
export function calculateRiskScore(factors: {
  newDevice?: boolean
  newLocation?: boolean
  failedAttempts?: number
  timeOfDay?: number // 0-23
  vpnDetected?: boolean
}): number {
  let score = 0

  if (factors.newDevice) score += 20
  if (factors.newLocation) score += 25
  if (factors.failedAttempts) score += Math.min(factors.failedAttempts * 10, 40)
  if (factors.vpnDetected) score += 15

  // Unusual hours (2am-5am local time)
  if (factors.timeOfDay !== undefined && factors.timeOfDay >= 2 && factors.timeOfDay <= 5) {
    score += 10
  }

  return Math.min(score, 100)
}
