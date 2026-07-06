'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CameraOff,
  RefreshCw,
} from 'lucide-react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/client-logger'

interface LivePhotoCaptureProps {
  listingId: string
  /** When true the signal is already earned, so the control is hidden. */
  alreadyVerified?: boolean
}

/**
 * Phases of the capture flow:
 * - starting     requesting camera permission / warming up the stream
 * - streaming    live preview shown, waiting for the user to take the shot
 * - captured     a still was grabbed, showing the review + confirm step
 * - uploading    storing the photo and recording the verification signal
 * - success      signal recorded
 * - error        upload/record failed (retryable)
 * - denied       user blocked camera permission
 * - no-camera    no camera device found
 * - unsupported  browser lacks getUserMedia (e.g. non-HTTPS / old browser)
 */
type Phase =
  | 'starting'
  | 'streaming'
  | 'captured'
  | 'uploading'
  | 'success'
  | 'error'
  | 'denied'
  | 'no-camera'
  | 'unsupported'

const JPEG_QUALITY = 0.85

/** Best-effort coarse location; never rejects, resolves null on any failure. */
function getCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    )
  })
}

export function LivePhotoCapture({ listingId, alreadyVerified = false }: LivePhotoCaptureProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('starting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedBlobRef = useRef<Blob | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
    capturedBlobRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setErrorMsg(null)
    clearPreview()

    // Feature-detect: getUserMedia is unavailable on insecure origins and very
    // old browsers. Fail gracefully instead of throwing.
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPhase('unsupported')
      return
    }

    setPhase('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setPhase('streaming')
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPhase('denied')
      } else if (
        name === 'NotFoundError' ||
        name === 'DevicesNotFoundError' ||
        name === 'OverconstrainedError'
      ) {
        setPhase('no-camera')
      } else {
        clientLogger.error('getUserMedia failed', err)
        setErrorMsg('Could not start the camera. Please try again.')
        setPhase('error')
      }
    }
  }, [clearPreview])

  // Attach the live stream once the <video> element is mounted for the
  // streaming phase (the element does not exist during 'starting').
  useEffect(() => {
    if (phase === 'streaming' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {
        /* autoplay can reject silently; the muted+playsInline attrs cover most cases */
      })
    }
  }, [phase])

  // Stop tracks + revoke object URLs on unmount.
  useEffect(() => {
    return () => {
      stopStream()
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [stopStream])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    void startCamera()
  }, [startCamera])

  const handleClose = useCallback(() => {
    // Don't interrupt an in-flight upload.
    if (phase === 'uploading') return
    stopStream()
    clearPreview()
    setIsOpen(false)
    // If we just succeeded, the badges/level were re-derived server-side; pull
    // fresh server-component data so the listing reflects the new signal.
    if (phase === 'success') {
      router.refresh()
    }
    setPhase('starting')
    setErrorMsg(null)
  }, [phase, stopStream, clearPreview, router])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setErrorMsg('Could not capture the photo. Please try again.')
      setPhase('error')
      return
    }
    ctx.drawImage(video, 0, 0, width, height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMsg('Could not capture the photo. Please try again.')
          setPhase('error')
          return
        }
        capturedBlobRef.current = blob
        const url = URL.createObjectURL(blob)
        previewUrlRef.current = url
        setPreviewUrl(url)
        // Freeze the frame: release the camera while the user reviews.
        stopStream()
        setPhase('captured')
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  }, [stopStream])

  const handleRetake = useCallback(() => {
    void startCamera()
  }, [startCamera])

  const handleSubmit = useCallback(async () => {
    const blob = capturedBlobRef.current
    if (!blob) return
    setPhase('uploading')
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be signed in to verify this listing.')
      }

      // The live-photo endpoint requires the URL to contain
      // `/listing-photos/${listingId}/`, so the photo must live under the
      // LISTING's folder (not the uploader's user folder). We upload directly
      // via the Storage client because /api/upload forces a `${userId}/` prefix
      // and cannot target the listing folder. See report notes on this mismatch.
      const rand = Math.random().toString(36).slice(2, 8)
      const path = `${listingId}/live-photo-${Date.now()}-${rand}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload the photo.')
      }

      const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(path)

      const coords = await getCoords()

      const res = await fetch(`/api/listings/${listingId}/live-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: urlData.publicUrl,
          capturedAt: new Date().toISOString(),
          source: 'camera',
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || 'Could not record the live photo.')
      }

      clearPreview()
      setPhase('success')
      // Refresh server data so badges/level update behind the modal.
      router.refresh()
    } catch (err) {
      clientLogger.error('Live photo verification failed', err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPhase('error')
    }
  }, [listingId, clearPreview, router])

  if (alreadyVerified) return null

  return (
    <>
      <Button variant="outline" className="w-full" onClick={handleOpen}>
        <Camera className="h-4 w-4 mr-2" />
        Verify with a live photo
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        closeOnBackdrop={phase !== 'uploading'}
        closeOnEscape={phase !== 'uploading'}
        ariaLabelledBy="live-photo-title"
      >
        <ModalHeader onClose={phase === 'uploading' ? undefined : handleClose}>
          <ModalTitle id="live-photo-title">Verify with a live photo</ModalTitle>
        </ModalHeader>

        <ModalContent>
          {(phase === 'starting' || phase === 'streaming' || phase === 'captured') && (
            <p className="text-sm text-on-surface-variant mb-3">
              Take a photo from inside the place you&apos;re listing. This adds a Live Photo badge
              that shows renters the listing was confirmed on-site.
            </p>
          )}

          {/* Live preview / captured still */}
          {(phase === 'starting' || phase === 'streaming') && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {phase === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Starting camera…</span>
                </div>
              )}
            </div>
          )}

          {(phase === 'captured' || phase === 'uploading') && previewUrl && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4]">
              {/* Review still — object URL, not a remote image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Captured preview" className="w-full h-full object-cover" />
              {phase === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Uploading…</span>
                </div>
              )}
            </div>
          )}

          {/* Terminal / error states */}
          {phase === 'denied' && (
            <StatusBlock
              icon={<CameraOff className="h-6 w-6 text-error" />}
              tone="error"
              title="Camera access blocked"
              message="We need camera access to capture a live photo. Enable camera permission for this site in your browser settings, then try again."
            />
          )}

          {phase === 'no-camera' && (
            <StatusBlock
              icon={<CameraOff className="h-6 w-6 text-error" />}
              tone="error"
              title="No camera found"
              message="We couldn't find a camera on this device. Try again on a phone or a device with a camera."
            />
          )}

          {phase === 'unsupported' && (
            <StatusBlock
              icon={<AlertCircle className="h-6 w-6 text-error" />}
              tone="error"
              title="Camera not available"
              message="Your browser can't access the camera here. This requires a secure (HTTPS) connection and a modern browser."
            />
          )}

          {phase === 'error' && (
            <StatusBlock
              icon={<AlertCircle className="h-6 w-6 text-error" />}
              tone="error"
              title="Something went wrong"
              message={errorMsg || 'We couldn’t save your live photo. Please try again.'}
            />
          )}

          {phase === 'success' && (
            <StatusBlock
              icon={<CheckCircle2 className="h-6 w-6 text-secondary" />}
              tone="success"
              title="Live photo verified"
              message="Your listing now shows the Live Photo badge. Thanks for helping renters trust it."
            />
          )}
        </ModalContent>

        <ModalFooter>
          {phase === 'streaming' && (
            <Button onClick={handleCapture}>
              <Camera className="h-4 w-4 mr-2" />
              Take photo
            </Button>
          )}

          {phase === 'captured' && (
            <>
              <Button variant="outline" onClick={handleRetake}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button onClick={handleSubmit}>Use this photo</Button>
            </>
          )}

          {phase === 'uploading' && (
            <Button disabled isLoading>
              Uploading…
            </Button>
          )}

          {(phase === 'denied' || phase === 'no-camera' || phase === 'error') && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleRetake}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </>
          )}

          {(phase === 'unsupported' || phase === 'success') && (
            <Button onClick={handleClose}>Done</Button>
          )}

          {phase === 'starting' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </>
  )
}

function StatusBlock({
  icon,
  title,
  message,
  tone,
}: {
  icon: React.ReactNode
  title: string
  message: string
  tone: 'error' | 'success'
}) {
  return (
    <div className="text-center py-8">
      <div
        className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          tone === 'error' ? 'bg-error-container' : 'bg-secondary/10'
        }`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-2">{title}</h3>
      <p className="text-on-surface-variant max-w-sm mx-auto text-sm">{message}</p>
    </div>
  )
}
