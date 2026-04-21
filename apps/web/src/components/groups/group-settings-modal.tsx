'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal, ModalHeader, ModalTitle, ModalContent } from '@/components/ui/modal'
import { Loader2 } from 'lucide-react'

interface GroupSettingsModalProps {
  groupId: string
  initialName: string
  initialDescription: string
  isOpen?: boolean
  onClose: () => void
  onSaved: () => void
}

export function GroupSettingsModal({
  groupId,
  initialName,
  initialDescription,
  isOpen = true,
  onClose,
  onSaved,
}: GroupSettingsModalProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update group')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabelledBy="group-settings-title">
      <ModalHeader onClose={onClose}>
        <ModalTitle id="group-settings-title">Edit Group</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-on-surface-variant mb-1">
              Group name
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="group-mission" className="block text-sm font-medium text-on-surface-variant mb-1">
              Mission
            </label>
            <textarea
              id="group-mission"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="A short description of what this group is looking for together."
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary resize-none"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              {description.length}/2000
            </p>
          </div>

          {error && (
            <div className="p-3 bg-tertiary-fixed text-tertiary-container rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
