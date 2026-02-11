import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

export type JobType =
  | 'send_email'
  | 'send_notification'
  | 'refresh_suggestions'
  | 'cleanup_expired_data'
  | 'process_verification'
  | 'sync_stripe'
  | 'generate_report'
  | 'purge_deleted_data'

export type JobQueue = 'default' | 'high' | 'low' | 'scheduled'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Job {
  id: string
  queue: JobQueue
  jobType: JobType
  payload: Record<string, any>
  priority: number
  status: JobStatus
  attempts: number
  maxAttempts: number
  scheduledFor: Date
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  result?: Record<string, any>
  createdAt: Date
}

export interface EnqueueOptions {
  queue?: JobQueue
  priority?: number
  scheduledFor?: Date
  maxAttempts?: number
}

/**
 * Enqueue a new background job
 */
export async function enqueueJob(
  jobType: JobType,
  payload: Record<string, any>,
  options: EnqueueOptions = {}
): Promise<Job | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('background_jobs')
    .insert({
      job_type: jobType,
      payload,
      queue: options.queue || 'default',
      priority: options.priority || 0,
      scheduled_for: options.scheduledFor?.toISOString() || new Date().toISOString(),
      max_attempts: options.maxAttempts || 3,
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to enqueue job', error instanceof Error ? error : new Error(String(error)))
    return null
  }

  return mapJob(data)
}

/**
 * Enqueue multiple jobs at once
 */
export async function enqueueJobs(
  jobs: Array<{ jobType: JobType; payload: Record<string, any>; options?: EnqueueOptions }>
): Promise<number> {
  const supabase = createServiceClient()

  const records = jobs.map(job => ({
    job_type: job.jobType,
    payload: job.payload,
    queue: job.options?.queue || 'default',
    priority: job.options?.priority || 0,
    scheduled_for: job.options?.scheduledFor?.toISOString() || new Date().toISOString(),
    max_attempts: job.options?.maxAttempts || 3,
  }))

  const { data, error } = await supabase
    .from('background_jobs')
    .insert(records)
    .select()

  if (error) {
    logger.error('Failed to enqueue jobs', error instanceof Error ? error : new Error(String(error)))
    return 0
  }

  return data?.length || 0
}

/**
 * Schedule a job for future execution
 */
export function scheduleJob(
  jobType: JobType,
  payload: Record<string, any>,
  runAt: Date,
  options: Omit<EnqueueOptions, 'scheduledFor'> = {}
): Promise<Job | null> {
  return enqueueJob(jobType, payload, { ...options, scheduledFor: runAt })
}

/**
 * Schedule a recurring job (helper for common patterns)
 */
export async function scheduleRecurringJob(
  jobType: JobType,
  payload: Record<string, any>,
  intervalMinutes: number
): Promise<Job | null> {
  const nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000)
  return scheduleJob(jobType, { ...payload, _recurring: true, _intervalMinutes: intervalMinutes }, nextRun)
}

/**
 * Claim the next available job from a queue
 */
export async function claimJob(queue: JobQueue = 'default'): Promise<Job | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('claim_background_job', {
    p_queue: queue,
  })

  if (error || !data) {
    return null
  }

  return mapJob(data)
}

/**
 * Complete a job successfully
 */
export async function completeJob(jobId: string, result?: Record<string, any>): Promise<void> {
  const supabase = createServiceClient()

  await supabase.rpc('complete_background_job', {
    p_job_id: jobId,
    p_result: result || null,
  })
}

/**
 * Fail a job (will retry if attempts remaining)
 */
export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = createServiceClient()

  await supabase.rpc('fail_background_job', {
    p_job_id: jobId,
    p_error: errorMessage,
  })
}

/**
 * Cancel a pending job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('background_jobs')
    .update({ status: 'cancelled' })
    .eq('id', jobId)
    .eq('status', 'pending')

  return !error
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    return null
  }

  return mapJob(data)
}

/**
 * Get pending jobs count by queue
 */
export async function getPendingJobsCount(): Promise<Record<JobQueue, number>> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('background_jobs')
    .select('queue')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())

  if (error || !data) {
    return { default: 0, high: 0, low: 0, scheduled: 0 }
  }

  const counts: Record<JobQueue, number> = { default: 0, high: 0, low: 0, scheduled: 0 }
  for (const row of data) {
    counts[row.queue as JobQueue] = (counts[row.queue as JobQueue] || 0) + 1
  }

  return counts
}

// ============================================
// JOB HANDLERS
// ============================================

type JobHandler = (payload: Record<string, any>) => Promise<Record<string, any> | void>

const jobHandlers: Partial<Record<JobType, JobHandler>> = {}

/**
 * Register a job handler
 */
export function registerJobHandler(jobType: JobType, handler: JobHandler): void {
  jobHandlers[jobType] = handler
}

/**
 * Process a single job
 */
export async function processJob(job: Job): Promise<void> {
  const handler = jobHandlers[job.jobType]

  if (!handler) {
    await failJob(job.id, `No handler registered for job type: ${job.jobType}`)
    return
  }

  try {
    const result = await handler(job.payload)
    await completeJob(job.id, result as Record<string, any>)

    // Handle recurring jobs
    if (job.payload._recurring && job.payload._intervalMinutes) {
      await scheduleRecurringJob(
        job.jobType,
        job.payload,
        job.payload._intervalMinutes
      )
    }
  } catch (error) {
    await failJob(job.id, error instanceof Error ? error.message : 'Unknown error')
  }
}

/**
 * Run the job processor (call this from a cron job or edge function)
 */
export async function runJobProcessor(
  queue: JobQueue = 'default',
  maxJobs: number = 10
): Promise<number> {
  let processed = 0

  for (let i = 0; i < maxJobs; i++) {
    const job = await claimJob(queue)
    if (!job) break

    await processJob(job)
    processed++
  }

  return processed
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Enqueue an email job
 */
export function enqueueEmail(
  to: string,
  template: string,
  data: Record<string, any>,
  options?: EnqueueOptions
): Promise<Job | null> {
  return enqueueJob('send_email', { to, template, data }, { queue: 'high', ...options })
}

/**
 * Enqueue a notification job
 */
export function enqueueNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: EnqueueOptions
): Promise<Job | null> {
  return enqueueJob('send_notification', { userId, type, title, body, data }, options)
}

/**
 * Enqueue a suggestions refresh job
 */
export function enqueueSuggestionsRefresh(userId: string): Promise<Job | null> {
  return enqueueJob('refresh_suggestions', { userId }, { queue: 'low' })
}

// Helper to map database row to Job
function mapJob(row: any): Job {
  return {
    id: row.id,
    queue: row.queue,
    jobType: row.job_type,
    payload: row.payload,
    priority: row.priority,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    scheduledFor: new Date(row.scheduled_for),
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    errorMessage: row.error_message,
    result: row.result,
    createdAt: new Date(row.created_at),
  }
}
