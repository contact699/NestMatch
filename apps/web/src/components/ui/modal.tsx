'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Modal content */
  children: React.ReactNode
  /** Max width of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
  /** Additional class name for the modal container */
  className?: string
  /** Accessible label for the modal */
  ariaLabel?: string
  /** ID of element that labels the modal (typically the title) */
  ariaLabelledBy?: string
  /** ID of element that describes the modal */
  ariaDescribedBy?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

/**
 * Base modal component with backdrop, centering, and escape handling.
 *
 * @example
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
 *   <ModalHeader onClose={() => setShowModal(false)}>
 *     <ModalTitle>Edit Profile</ModalTitle>
 *   </ModalHeader>
 *   <ModalContent>
 *     <p>Modal content here</p>
 *   </ModalContent>
 *   <ModalFooter>
 *     <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
 *     <Button onClick={handleSave}>Save</Button>
 *   </ModalFooter>
 * </Modal>
 */
export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Stash the latest onClose / closeOnEscape in a ref so the open-time effect
  // below can depend solely on `isOpen`. If we put `handleKeyDown` (or its
  // deps) in the effect dep array, every parent re-render — e.g. typing a
  // character into an input that lives in the modal — would re-run the effect
  // and re-focus the first focusable element, stealing focus from the input.
  const onCloseRef = useRef(onClose)
  const closeOnEscapeRef = useRef(closeOnEscape)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { closeOnEscapeRef.current = closeOnEscape }, [closeOnEscape])

  useEffect(() => {
    if (!isOpen) return

    previousActiveElement.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscapeRef.current) {
        onCloseRef.current()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    const focusFrame = requestAnimationFrame(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    })

    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-surface-container-lowest rounded-xl w-full max-h-[90vh] overflow-y-auto shadow-xl',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {children}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: React.ReactNode
  /** Show close button */
  onClose?: () => void
  /** Additional class name */
  className?: string
}

/**
 * Modal header with optional close button.
 */
export function ModalHeader({ children, onClose, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border-b border-outline-variant/15',
        className
      )}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 hover:bg-surface-container-low rounded-lg transition-colors -mr-2"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-on-surface-variant" />
        </button>
      )}
    </div>
  )
}

interface ModalTitleProps {
  children: React.ReactNode
  className?: string
  /** ID for aria-labelledby reference */
  id?: string
}

/**
 * Modal title text.
 */
export function ModalTitle({ children, className, id = 'modal-title' }: ModalTitleProps) {
  return (
    <h2 id={id} className={cn('text-lg font-semibold text-on-surface', className)}>
      {children}
    </h2>
  )
}

interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

/**
 * Modal content area.
 */
export function ModalContent({ children, className }: ModalContentProps) {
  return <div className={cn('p-4', className)}>{children}</div>
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

/**
 * Modal footer for action buttons.
 */
export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex gap-3 justify-end p-4 border-t border-outline-variant/15',
        className
      )}
    >
      {children}
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
}

/**
 * Pre-built confirmation modal for delete/confirm actions.
 *
 * @example
 * <ConfirmModal
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Listing?"
 *   message="This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 *   isLoading={isDeleting}
 * />
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  // Import Button inline to avoid circular deps
  const Button = require('./button').Button

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-2">{title}</h3>
        <p className="text-on-surface-variant mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
