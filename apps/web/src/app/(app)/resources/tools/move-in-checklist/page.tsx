'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { ArrowLeft, CheckSquare, Circle, CheckCircle2, RotateCcw, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { toast } from 'sonner'

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface ChecklistSection {
  id: string
  title: string
  items: ChecklistItem[]
}

const DEFAULT_CHECKLIST: ChecklistSection[] = [
  {
    id: 'before-moving',
    title: 'Before Moving Day',
    items: [
      { id: 'b1', text: 'Sign the lease and keep a copy', completed: false },
      { id: 'b2', text: 'Pay security deposit and first/last month rent', completed: false },
      { id: 'b3', text: 'Get renter\'s insurance', completed: false },
      { id: 'b4', text: 'Set up utilities (hydro, gas, internet)', completed: false },
      { id: 'b5', text: 'Update your address (bank, employer, CRA)', completed: false },
      { id: 'b6', text: 'Forward mail from old address', completed: false },
      { id: 'b7', text: 'Arrange movers or moving truck', completed: false },
      { id: 'b8', text: 'Gather packing supplies', completed: false },
      { id: 'b9', text: 'Start packing non-essentials', completed: false },
      { id: 'b10', text: 'Create a roommate agreement', completed: false },
    ],
  },
  {
    id: 'move-in-day',
    title: 'Move-In Day',
    items: [
      { id: 'm1', text: 'Do a walk-through with landlord/roommate', completed: false },
      { id: 'm2', text: 'Take photos/video of the unit condition', completed: false },
      { id: 'm3', text: 'Complete and sign move-in inspection report', completed: false },
      { id: 'm4', text: 'Collect all keys (unit, mailbox, building)', completed: false },
      { id: 'm5', text: 'Test all locks and security features', completed: false },
      { id: 'm6', text: 'Check all appliances are working', completed: false },
      { id: 'm7', text: 'Test smoke and carbon monoxide detectors', completed: false },
      { id: 'm8', text: 'Note existing damage on inspection form', completed: false },
      { id: 'm9', text: 'Get landlord/roommate emergency contacts', completed: false },
      { id: 'm10', text: 'Locate fire exits and extinguisher', completed: false },
    ],
  },
  {
    id: 'first-week',
    title: 'First Week',
    items: [
      { id: 'f1', text: 'Unpack essentials (kitchen, bathroom, bedroom)', completed: false },
      { id: 'f2', text: 'Set up internet connection', completed: false },
      { id: 'f3', text: 'Discuss house rules with roommates', completed: false },
      { id: 'f4', text: 'Create shared grocery/supply list', completed: false },
      { id: 'f5', text: 'Set up rent payment method', completed: false },
      { id: 'f6', text: 'Add important dates to calendar (rent due, etc.)', completed: false },
      { id: 'f7', text: 'Explore the neighborhood (grocery, transit, etc.)', completed: false },
      { id: 'f8', text: 'Meet neighbors if appropriate', completed: false },
      { id: 'f9', text: 'Set up cleaning schedule with roommates', completed: false },
      { id: 'f10', text: 'Report any issues to landlord in writing', completed: false },
    ],
  },
  {
    id: 'roommate-setup',
    title: 'Roommate Essentials',
    items: [
      { id: 'r1', text: 'Exchange phone numbers and contacts', completed: false },
      { id: 'r2', text: 'Discuss quiet hours and schedules', completed: false },
      { id: 'r3', text: 'Agree on guest policies', completed: false },
      { id: 'r4', text: 'Set up shared expense tracking', completed: false },
      { id: 'r5', text: 'Agree on cleaning responsibilities', completed: false },
      { id: 'r6', text: 'Discuss shared vs personal food/supplies', completed: false },
      { id: 'r7', text: 'Set up shared calendar or communication tool', completed: false },
      { id: 'r8', text: 'Agree on handling of mail/packages', completed: false },
    ],
  },
]

const STORAGE_KEY = 'nestmatch-move-in-checklist'

export default function MoveInChecklistPage() {
  const [checklist, setChecklist] = useState<ChecklistSection[]>(DEFAULT_CHECKLIST)
  const [isLoaded, setIsLoaded] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}})

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setChecklist(JSON.parse(saved))
      } catch (e) {
        clientLogger.error('Error loading checklist', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist))
    }
  }, [checklist, isLoaded])

  const toggleItem = (sectionId: string, itemId: string) => {
    setChecklist((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : section
      )
    )
  }

  const resetChecklist = () => {
    setConfirmModal({
      open: true,
      title: 'Reset Checklist',
      message: 'Reset all items? This cannot be undone.',
      onConfirm: () => {
        setChecklist(DEFAULT_CHECKLIST)
        toast.success('Checklist has been reset')
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const printChecklist = () => {
    window.print()
  }

  const totalItems = checklist.reduce((sum, s) => sum + s.items.length, 0)
  const completedItems = checklist.reduce(
    (sum, s) => sum + s.items.filter((i) => i.completed).length,
    0
  )
  const progressPercent = Math.round((completedItems / totalItems) * 100)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6 print:hidden">
        <Link
          href="/resources/tools"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-7 w-7 text-green-600" />
            Move-In Checklist
          </h1>
          <p className="mt-1 text-gray-600">
            Track your progress and make sure nothing is missed
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={printChecklist}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={resetChecklist}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">
              {completedItems} of {totalItems} completed
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-center text-lg font-semibold text-green-600 mt-2">
            {progressPercent}%
          </p>
        </CardContent>
      </Card>

      {/* Checklist Sections */}
      <div className="space-y-6">
        {checklist.map((section) => {
          const sectionCompleted = section.items.filter((i) => i.completed).length
          const sectionTotal = section.items.length

          return (
            <Card key={section.id} variant="bordered">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <span className="text-sm text-gray-500">
                    {sectionCompleted}/{sectionTotal}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(sectionCompleted / sectionTotal) * 100}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => toggleItem(section.id, item.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            item.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tips */}
      <Card variant="bordered" className="mt-6 print:hidden">
        <CardContent className="py-4">
          <h3 className="font-medium text-gray-900 mb-2">Tips</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Your progress is automatically saved to your browser</li>
            <li>• Print this checklist to take with you on move-in day</li>
            <li>• Photos of unit condition are crucial for deposit protection</li>
            <li>• Put any concerns in writing to your landlord within the first week</li>
          </ul>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Reset"
        variant="danger"
      />

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl,
          .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
