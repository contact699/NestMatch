'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  RotateCcw,
  Printer,
  FileDown,
  Camera,
  Key,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import { toast } from 'sonner'

interface ChecklistItem {
  id: string
  text: string
  description?: string
  completed: boolean
  tag?: 'URGENT' | 'ADMIN' | 'COMMUNITY'
  featured?: boolean
  featuredIcon?: 'camera' | 'key'
}

interface ChecklistSection {
  id: string
  title: string
  phase: string
  items: ChecklistItem[]
}

const DEFAULT_CHECKLIST: ChecklistSection[] = [
  {
    id: 'before-moving',
    title: 'Before Moving',
    phase: 'PHASE 01',
    items: [
      { id: 'b1', text: 'Confirm utility switchover', description: 'Hydro, Water, Gas, and Internet services.', completed: false, tag: 'URGENT' },
      { id: 'b2', text: 'Secure tenant insurance', description: 'Email a copy of the policy to the landlord.', completed: false },
      { id: 'b3', text: 'Book service elevator', description: 'If moving into a high-rise, reserve your time slot.', completed: false },
      { id: 'b4', text: 'Forward mail from old address', description: 'Set up Canada Post mail forwarding.', completed: false, tag: 'ADMIN' },
      { id: 'b5', text: 'Sign the lease and keep a copy', description: 'Review all terms before signing.', completed: false },
      { id: 'b6', text: 'Pay security deposit and first/last month rent', description: 'Keep receipts for all payments.', completed: false },
      { id: 'b7', text: 'Arrange movers or moving truck', description: 'Book at least 2 weeks in advance.', completed: false },
      { id: 'b8', text: 'Create a roommate agreement', description: 'Use the NestMatch agreement generator.', completed: false },
    ],
  },
  {
    id: 'move-in-day',
    title: 'Move-In Day',
    phase: 'PHASE 02',
    items: [
      { id: 'm1', text: 'Photo Documentation', description: 'Take clear photos of every room, wall, and floor before moving furniture in.', completed: false, featured: true, featuredIcon: 'camera' },
      { id: 'm2', text: 'Key Exchange & Testing', description: 'Test all keys, fobs, and mailbox access with the property manager.', completed: false, featured: true, featuredIcon: 'key' },
      { id: 'm3', text: 'Sanitize high-touch surfaces', description: 'Wipe down doorknobs, switches, and counter surfaces.', completed: false },
      { id: 'm4', text: 'Complete move-in inspection report', description: 'Note all existing damage on the form.', completed: false },
      { id: 'm5', text: 'Test all appliances are working', description: 'Check stove, fridge, dishwasher, washer/dryer.', completed: false },
    ],
  },
  {
    id: 'first-week',
    title: 'First Week',
    phase: 'PHASE 03',
    items: [
      { id: 'f1', text: 'Update mailing address', description: 'Update bank, CRA, employer, and recurring subscriptions.', completed: false, tag: 'ADMIN' },
      { id: 'f2', text: 'Meet the neighbours', description: 'A simple \'Hello\' goes a long way in creating a sanctuary atmosphere.', completed: false, tag: 'COMMUNITY' },
      { id: 'f3', text: 'Set up internet connection', description: 'Schedule installation if not already active.', completed: false },
      { id: 'f4', text: 'Set up rent payment method', description: 'Automate if possible to never miss a payment.', completed: false },
    ],
  },
]

const STORAGE_KEY = 'nestmatch-move-in-checklist'

export default function MoveInChecklistPage() {
  const [checklist, setChecklist] = useState<ChecklistSection[]>(DEFAULT_CHECKLIST)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activePhase, setActivePhase] = useState('before-moving')
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
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const tagColors: Record<string, string> = {
    URGENT: 'bg-error-container text-error',
    ADMIN: 'bg-secondary-container text-secondary',
    COMMUNITY: 'bg-primary/10 text-primary',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6 print:hidden">
        <Link
          href="/resources/tools"
          className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-secondary mb-2">
            YOUR SANCTUARY SETUP
          </span>
          <h1 className="text-3xl font-display font-bold text-on-surface">
            Move-In Checklist
          </h1>
          <p className="mt-2 text-on-surface-variant max-w-xl">
            Transition smoothly into your new home with our curated timeline. Everything
            from logistics to the first night essentials.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={printChecklist}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <FileDown className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-surface-container-lowest ghost-border rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-surface-container"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progressPercent}, 100`}
                className="text-secondary"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-display font-bold text-on-surface">
              {progressPercent}%
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              OVERALL PROGRESS
            </p>
            <p className="text-lg font-display font-bold text-on-surface">
              {progressPercent}% Complete
            </p>
          </div>
        </div>
        <div className="hidden sm:block flex-1 text-right">
          <p className="text-sm text-on-surface-variant italic">
            &ldquo;A house is made with walls and beams; a home is built with love and dreams.&rdquo;
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Phase sidebar nav */}
        <div className="lg:col-span-1 print:hidden">
          <nav className="space-y-1 sticky top-4">
            {checklist.map((section) => {
              const sectionCompleted = section.items.filter(i => i.completed).length
              const isActive = activePhase === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActivePhase(section.id)
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-secondary-container text-secondary font-medium'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {sectionCompleted === section.items.length ? (
                    <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 flex-shrink-0" />
                  )}
                  {section.title}
                </button>
              )
            })}

            <div className="pt-4 mt-4 ghost-border-t">
              <Button variant="outline" size="sm" className="w-full" onClick={resetChecklist}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset All
              </Button>
            </div>
          </nav>
        </div>

        {/* Checklist content */}
        <div className="lg:col-span-3 space-y-10">
          {checklist.map((section) => {
            const sectionCompleted = section.items.filter((i) => i.completed).length
            const sectionTotal = section.items.length
            const featuredItems = section.items.filter(i => i.featured)
            const regularItems = section.items.filter(i => !i.featured)

            return (
              <section key={section.id} id={section.id}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block text-xs font-semibold tracking-widest text-secondary bg-secondary-container px-2 py-0.5 rounded">
                    {section.phase}
                  </span>
                  <h2 className="text-xl font-display font-bold text-on-surface">{section.title}</h2>
                  <span className="text-sm text-on-surface-variant ml-auto">{sectionTotal} items</span>
                </div>

                {/* Featured items as cards */}
                {featuredItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {featuredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(section.id, item.id)}
                        className={`relative text-left bg-surface-container-lowest ghost-border rounded-xl p-5 transition-all hover:shadow-sm ${
                          item.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                            {item.featuredIcon === 'camera' ? (
                              <Camera className="h-5 w-5 text-on-primary" />
                            ) : (
                              <Key className="h-5 w-5 text-on-primary" />
                            )}
                          </div>
                          <div className="w-6 h-6 rounded ghost-border flex items-center justify-center flex-shrink-0">
                            {item.completed && <CheckCircle2 className="h-5 w-5 text-secondary" />}
                          </div>
                        </div>
                        <h3 className={`font-semibold text-on-surface mt-3 ${item.completed ? 'line-through' : ''}`}>
                          {item.text}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-on-surface-variant mt-1">{item.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Regular items */}
                <div className="space-y-1">
                  {regularItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(section.id, item.id)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-5 h-5 rounded ghost-border flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              item.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'
                            }`}
                          >
                            {item.text}
                          </span>
                          {item.tag && (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${tagColors[item.tag]}`}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-on-surface-variant mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* Floating add button (mobile) */}
      <div className="fixed bottom-6 right-6 lg:hidden print:hidden">
        <button className="w-14 h-14 rounded-full bg-secondary text-on-primary shadow-lg flex items-center justify-center hover:bg-secondary/90 transition-colors">
          <Plus className="h-6 w-6" />
        </button>
      </div>

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
          .max-w-5xl,
          .max-w-5xl * {
            visibility: visible;
          }
          .max-w-5xl {
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
