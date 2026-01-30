'use client'

import { useEffect, useCallback } from 'react'
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
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    },
    [onClose, closeOnEscape]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscape])

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
        className={cn(
          'relative bg-white rounded-xl w-full max-h-[90vh] overflow-y-auto shadow-xl',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
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
        'flex items-center justify-between p-4 border-b border-gray-200',
        className
      )}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors -mr-2"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      )}
    </div>
  )
}

interface ModalTitleProps {
  children: React.ReactNode
  className?: string
}

/**
 * Modal title text.
 */
export function ModalTitle({ children, className }: ModalTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-gray-900', className)}>
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
        'flex gap-3 justify-end p-4 border-t border-gray-200',
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
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
