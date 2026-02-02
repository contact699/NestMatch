import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, detectAbuse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { generateRequestId } from '@/lib/request-context'
import { captureException } from '@/lib/error-reporter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Rate limiting for uploads
    const rateLimitResult = await checkRateLimit('photoUpload', user.id)
    if (!rateLimitResult.allowed) {
      await detectAbuse('photoUpload', user.id)
      logger.warn('Upload rate limit exceeded', { requestId, userId: user.id })
      return rateLimitResponse(rateLimitResult)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'listing-photos'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${user.id}/${timestamp}-${randomString}.${extension}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      logger.error('Upload error', error, { requestId, userId: user.id, bucket })

      if (error.message.includes('Bucket not found')) {
        return NextResponse.json(
          {
            error: 'Storage bucket not configured. Please create the bucket in Supabase dashboard.',
            details: error.message,
            requestId,
          },
          { status: 500, headers: { 'X-Request-ID': requestId } }
        )
      }

      return NextResponse.json(
        { error: 'Failed to upload file', requestId },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    const duration = Date.now() - startTime
    logger.info('File uploaded', { requestId, userId: user.id, duration, path: data.path })

    return NextResponse.json(
      { url: urlData.publicUrl, path: data.path, requestId },
      { headers: { 'X-Request-ID': requestId } }
    )
  } catch (error) {
    captureException(error as Error, { requestId, action: 'upload' })
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const bucket = searchParams.get('bucket') || 'listing-photos'

    if (!path) {
      return NextResponse.json(
        { error: 'No path provided', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Ensure user can only delete their own files
    if (!path.startsWith(`${user.id}/`)) {
      logger.warn('Forbidden delete attempt', { requestId, userId: user.id, path })
      return NextResponse.json(
        { error: 'Forbidden', requestId },
        { status: 403, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      logger.error('Delete error', error, { requestId, userId: user.id, path })
      return NextResponse.json(
        { error: 'Failed to delete file', requestId },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    logger.info('File deleted', { requestId, userId: user.id, path })

    return NextResponse.json(
      { success: true, requestId },
      { headers: { 'X-Request-ID': requestId } }
    )
  } catch (error) {
    captureException(error as Error, { requestId, action: 'delete_upload' })
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
