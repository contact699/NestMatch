# Resources Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the resources feature with admin management for agreement clauses, PDF generation, analytics dashboard, email notifications, content scheduling, and SEO metadata.

**Architecture:** Extends existing admin panel with clause management CRUD, adds @react-pdf/renderer for agreement PDFs, integrates Resend for email notifications, adds scheduling fields to resources/FAQs, and implements dynamic metadata generation.

**Tech Stack:** Next.js 16.1.4, React 19, Supabase, @react-pdf/renderer, Resend, react-hook-form, zod, TypeScript

---

## Phase 3A: Agreement Clauses Admin Panel

### Task 1: Create Agreement Clauses List Page

**Files:**
- Create: `src/app/(app)/admin/clauses/page.tsx`

**Step 1: Write the failing test**

Since this is a Next.js page component, we'll verify by checking the build compiles and page renders.

**Step 2: Create the clauses list page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Loader2, Pencil, Trash2, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AgreementClause } from '@/types/database'

export default function AdminClausesPage() {
  const [clauses, setClauses] = useState<AgreementClause[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchClauses()
  }, [])

  const fetchClauses = async () => {
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('agreement_clauses')
      .select('*')
      .order('category')
      .order('display_order')

    setClauses(data || [])
    setIsLoading(false)
  }

  const deleteClause = async (id: string) => {
    if (!confirm('Delete this clause?')) return

    const supabase = createClient()
    await (supabase as any).from('agreement_clauses').delete().eq('id', id)
    setClauses(clauses.filter(c => c.id !== id))
  }

  const groupedClauses = clauses.reduce((acc, clause) => {
    const cat = clause.category || 'uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(clause)
    return acc
  }, {} as Record<string, AgreementClause[]>)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agreement Clauses</h1>
          <p className="text-gray-600 mt-1">Manage clauses for the agreement generator</p>
        </div>
        <Link href="/admin/clauses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Clause
          </Button>
        </Link>
      </div>

      {clauses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clauses yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first agreement clause.</p>
          <Link href="/admin/clauses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Clause
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedClauses).map(([category, items]) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 capitalize">{category}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((clause) => (
                  <div key={clause.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-gray-300" />
                      <div>
                        <h3 className="font-medium text-gray-900">{clause.title}</h3>
                        <p className="text-sm text-gray-500">{clause.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {clause.is_required && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Required
                            </span>
                          )}
                          {clause.provinces?.map(p => (
                            <span key={p} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/clauses/${clause.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => deleteClause(clause.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/app/(app)/admin/clauses/page.tsx
git commit -m "feat(admin): add agreement clauses list page"
```

---

### Task 2: Create Clause Form Component

**Files:**
- Create: `src/components/admin/clause-form.tsx`

**Step 1: Create the clause form component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AgreementClause } from '@/types/database'

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'QC', name: 'Quebec' },
  { code: 'AB', name: 'Alberta' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland' },
  { code: 'PE', name: 'PEI' },
]

const CATEGORIES = [
  'basics',
  'financial',
  'lifestyle',
  'responsibilities',
  'termination',
]

interface ClauseFormProps {
  clause?: AgreementClause
  isEditing?: boolean
}

interface QuestionField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  options?: string[]
  required: boolean
}

export function ClauseForm({ clause, isEditing = false }: ClauseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    clause_key: clause?.clause_key || '',
    title: clause?.title || '',
    description: clause?.description || '',
    category: clause?.category || 'basics',
    provinces: clause?.provinces || [],
    is_required: clause?.is_required ?? false,
    is_active: clause?.is_active ?? true,
    display_order: clause?.display_order ?? 0,
    content_template: clause?.content_template || '',
  })

  const [questions, setQuestions] = useState<QuestionField[]>(
    (clause?.question_flow as QuestionField[]) || []
  )

  const toggleProvince = (code: string) => {
    setFormData(prev => ({
      ...prev,
      provinces: prev.provinces.includes(code)
        ? prev.provinces.filter(p => p !== code)
        : [...prev.provinces, code],
    }))
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      key: '',
      label: '',
      type: 'text',
      required: false,
    }])
  }

  const updateQuestion = (index: number, field: keyof QuestionField, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const clauseData = {
      ...formData,
      question_flow: questions,
    }

    try {
      if (isEditing && clause) {
        await (supabase as any)
          .from('agreement_clauses')
          .update(clauseData)
          .eq('id', clause.id)
      } else {
        await (supabase as any)
          .from('agreement_clauses')
          .insert(clauseData)
      }

      router.push('/admin/clauses')
    } catch (error) {
      console.error('Error saving clause:', error)
      alert('Failed to save clause')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/clauses')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Clause' : 'New Clause'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update this agreement clause' : 'Add a new agreement clause'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/clauses')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Clause Details</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clause Key *
                  </label>
                  <input
                    type="text"
                    value={formData.clause_key}
                    onChange={(e) => setFormData({ ...formData, clause_key: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="rent_payment"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (snake_case)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rent Payment Terms"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Defines how rent will be paid and split..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Template *
                </label>
                <textarea
                  value={formData.content_template}
                  onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="The total monthly rent of ${{total_rent}} will be split as follows: {{rent_split_details}}."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {"{{variable_name}}"} for dynamic content from questions
                </p>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <p className="text-gray-500 text-sm">No questions yet. Add questions to collect user input.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Key</label>
                        <input
                          type="text"
                          value={q.key}
                          onChange={(e) => updateQuestion(index, 'key', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                          placeholder="total_rent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="select">Select</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Label</label>
                        <input
                          type="text"
                          value={q.label}
                          onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                          placeholder="What is the total monthly rent?"
                        />
                      </div>
                      {q.type === 'select' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Options (comma-separated)</label>
                          <input
                            type="text"
                            value={q.options?.join(', ') || ''}
                            onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Required clause</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Provinces */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Provinces</h2>

            <div className="flex flex-wrap gap-2">
              {PROVINCES.map((province) => (
                <button
                  key={province.code}
                  type="button"
                  onClick={() => toggleProvince(province.code)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.provinces.includes(province.code)
                      ? 'bg-blue-100 border-blue-200 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {province.code}
                </button>
              ))}
            </div>
            {formData.provinces.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Leave empty for all provinces
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/admin/clause-form.tsx
git commit -m "feat(admin): add clause form component"
```

---

### Task 3: Create New/Edit Clause Pages

**Files:**
- Create: `src/app/(app)/admin/clauses/new/page.tsx`
- Create: `src/app/(app)/admin/clauses/[id]/edit/page.tsx`

**Step 1: Create new clause page**

```tsx
// src/app/(app)/admin/clauses/new/page.tsx
import { ClauseForm } from '@/components/admin/clause-form'

export default function NewClausePage() {
  return <ClauseForm />
}
```

**Step 2: Create edit clause page**

```tsx
// src/app/(app)/admin/clauses/[id]/edit/page.tsx
'use client'

import { useEffect, useState, use } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ClauseForm } from '@/components/admin/clause-form'
import { AgreementClause } from '@/types/database'

export default function EditClausePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [clause, setClause] = useState<AgreementClause | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchClause = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('agreement_clauses')
        .select('*')
        .eq('id', id)
        .single()

      setClause(data)
      setIsLoading(false)
    }

    fetchClause()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!clause) {
    return <div className="text-center py-16">Clause not found</div>
  }

  return <ClauseForm clause={clause} isEditing />
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/(app)/admin/clauses/new/page.tsx src/app/(app)/admin/clauses/[id]/edit/page.tsx
git commit -m "feat(admin): add new and edit clause pages"
```

---

### Task 4: Create Clauses API Route

**Files:**
- Create: `src/app/api/admin/clauses/route.ts`
- Create: `src/app/api/admin/clauses/[id]/route.ts`

**Step 1: Create clauses list/create API**

```typescript
// src/app/api/admin/clauses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: fetchError } = await supabase
    .from('agreement_clauses')
    .select('*')
    .order('category')
    .order('display_order')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json()

  const { data, error: insertError } = await supabase
    .from('agreement_clauses')
    .insert(body)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

**Step 2: Create single clause API**

```typescript
// src/app/api/admin/clauses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: fetchError } = await supabase
    .from('agreement_clauses')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json()

  const { data, error: updateError } = await supabase
    .from('agreement_clauses')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { error: deleteError } = await supabase
    .from('agreement_clauses')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/admin/clauses/
git commit -m "feat(api): add admin clauses API routes"
```

---

## Phase 3B: PDF Generation for Agreements

### Task 5: Install @react-pdf/renderer

**Step 1: Install the package**

Run: `npm install @react-pdf/renderer`

**Step 2: Verify installation**

Run: `npm ls @react-pdf/renderer`
Expected: Shows version installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @react-pdf/renderer for agreement PDFs"
```

---

### Task 6: Create PDF Document Component

**Files:**
- Create: `src/components/resources/agreement/agreement-pdf.tsx`

**Step 1: Create the PDF document component**

```tsx
'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  list: {
    marginLeft: 15,
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 4,
  },
  signatureSection: {
    marginTop: 40,
  },
  signatureBlock: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: '45%',
  },
  signatureLabel: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 5,
    marginTop: 40,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
  },
  disclaimer: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#f5f5f5',
    fontSize: 9,
    color: '#666',
  },
})

interface AgreementPDFProps {
  title: string
  address: string
  province: string
  moveInDate: string
  roommates: string[]
  clauses: {
    title: string
    content: string
  }[]
  generatedAt: string
}

export function AgreementPDF({
  title,
  address,
  province,
  moveInDate,
  roommates,
  clauses,
  generatedAt,
}: AgreementPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Roommate Agreement</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          <Text style={styles.paragraph}>
            Address: {address}
          </Text>
          <Text style={styles.paragraph}>
            Province: {province}
          </Text>
          <Text style={styles.paragraph}>
            Move-in Date: {moveInDate}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roommates</Text>
          <View style={styles.list}>
            {roommates.map((name, index) => (
              <Text key={index} style={styles.listItem}>
                • {name}
              </Text>
            ))}
          </View>
        </View>

        {clauses.map((clause, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {index + 1}. {clause.title}
            </Text>
            <Text style={styles.paragraph}>{clause.content}</Text>
          </View>
        ))}

        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          <Text style={styles.paragraph}>
            By signing below, all parties agree to the terms outlined in this agreement.
          </Text>

          <View style={styles.signatureBlock}>
            {roommates.slice(0, 2).map((name, index) => (
              <View key={index} style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>
                  {name} - Date: ___________
                </Text>
              </View>
            ))}
          </View>

          {roommates.length > 2 && (
            <View style={styles.signatureBlock}>
              {roommates.slice(2, 4).map((name, index) => (
                <View key={index} style={styles.signatureLine}>
                  <Text style={styles.signatureLabel}>
                    {name} - Date: ___________
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.disclaimer}>
          <Text>
            DISCLAIMER: This agreement is provided as a template only and does not constitute legal advice.
            The terms in this document may not be enforceable in all jurisdictions.
            Consult with a legal professional for advice specific to your situation.
          </Text>
        </View>

        <Text style={styles.footer}>
          Generated on {generatedAt} via NestMatch
        </Text>
      </Page>
    </Document>
  )
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/resources/agreement/agreement-pdf.tsx
git commit -m "feat: add agreement PDF document component"
```

---

### Task 7: Update Agreement Download Step

**Files:**
- Modify: `src/app/(app)/resources/agreement/steps/step-download.tsx`

**Step 1: Read the current file**

First read the existing step-download.tsx to understand its current implementation.

**Step 2: Update with PDF generation**

Add PDF generation using @react-pdf/renderer's pdf() function and blob download.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileText, Loader2, Check, Share2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pdf } from '@react-pdf/renderer'
import { AgreementPDF } from '@/components/resources/agreement/agreement-pdf'

interface StepDownloadProps {
  data: {
    title: string
    address: string
    province: string
    moveInDate: string
    roommates: string[]
    clauses: { title: string; content: string }[]
  }
  onBack: () => void
}

export function StepDownload({ data, onBack }: StepDownloadProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [copied, setCopied] = useState(false)

  const generatePDF = async () => {
    setIsGenerating(true)

    try {
      const doc = (
        <AgreementPDF
          title={data.title}
          address={data.address}
          province={data.province}
          moveInDate={data.moveInDate}
          roommates={data.roommates}
          clauses={data.clauses}
          generatedAt={new Date().toLocaleDateString()}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${data.title.replace(/\s+/g, '-').toLowerCase()}-agreement.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setIsGenerated(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = () => {
    // This would copy a shareable link if saved to server
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your Agreement is Ready!
        </h2>
        <p className="text-gray-600">
          Download your customized roommate agreement as a PDF.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Agreement Summary</h3>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Title:</dt>
            <dd className="text-gray-900 font-medium">{data.title}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Property:</dt>
            <dd className="text-gray-900">{data.address}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Province:</dt>
            <dd className="text-gray-900">{data.province}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Move-in Date:</dt>
            <dd className="text-gray-900">{data.moveInDate}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Roommates:</dt>
            <dd className="text-gray-900">{data.roommates.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Clauses:</dt>
            <dd className="text-gray-900">{data.clauses.length}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={generatePDF}
          disabled={isGenerating}
          className="w-full max-w-xs"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : isGenerated ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Download Again
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              Download PDF
            </>
          )}
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy Link
              </>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Remember:</strong> This agreement is a template and may not be legally binding.
          Have all roommates sign the printed document and keep copies for everyone.
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onBack}>
          Back to Review
        </Button>
        <Button variant="outline" onClick={() => router.push('/resources/agreement')}>
          Start New Agreement
        </Button>
      </div>
    </div>
  )
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/(app)/resources/agreement/steps/step-download.tsx
git commit -m "feat: integrate PDF generation in agreement download step"
```

---

## Phase 3C: Analytics Dashboard

### Task 8: Create Analytics Dashboard Page

**Files:**
- Create: `src/app/(app)/admin/analytics/page.tsx`

**Step 1: Create the analytics page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  BookOpen,
  HelpCircle,
  Loader2,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  resources: {
    totalViews: number
    totalHelpful: number
    topResources: { id: string; title: string; views: number; helpful: number }[]
  }
  faqs: {
    totalHelpful: number
    totalNotHelpful: number
    helpfulRate: number
    topFAQs: { id: string; question: string; helpful: number; notHelpful: number }[]
  }
  trends: {
    date: string
    views: number
    helpful: number
  }[]
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Fetch resources data
    const { data: resources } = await (supabase as any)
      .from('resources')
      .select('id, title, view_count, helpful_count')
      .order('view_count', { ascending: false })
      .limit(10)

    const totalViews = resources?.reduce((sum: number, r: any) => sum + (r.view_count || 0), 0) || 0
    const totalResourceHelpful = resources?.reduce((sum: number, r: any) => sum + (r.helpful_count || 0), 0) || 0

    // Fetch FAQs data
    const { data: faqs } = await (supabase as any)
      .from('faqs')
      .select('id, question, helpful_count, not_helpful_count')
      .order('helpful_count', { ascending: false })
      .limit(10)

    const totalFaqHelpful = faqs?.reduce((sum: number, f: any) => sum + (f.helpful_count || 0), 0) || 0
    const totalNotHelpful = faqs?.reduce((sum: number, f: any) => sum + (f.not_helpful_count || 0), 0) || 0
    const helpfulRate = totalFaqHelpful + totalNotHelpful > 0
      ? (totalFaqHelpful / (totalFaqHelpful + totalNotHelpful)) * 100
      : 0

    setData({
      resources: {
        totalViews,
        totalHelpful: totalResourceHelpful,
        topResources: (resources || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          views: r.view_count || 0,
          helpful: r.helpful_count || 0,
        })),
      },
      faqs: {
        totalHelpful: totalFaqHelpful,
        totalNotHelpful,
        helpfulRate,
        topFAQs: (faqs || []).map((f: any) => ({
          id: f.id,
          question: f.question,
          helpful: f.helpful_count || 0,
          notHelpful: f.not_helpful_count || 0,
        })),
      },
      trends: [], // Would need time-series data in DB
    })

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track engagement with your knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Views</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data?.resources.totalViews.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Helpful Votes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {((data?.resources.totalHelpful || 0) + (data?.faqs.totalHelpful || 0)).toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">FAQ Helpful Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data?.faqs.helpfulRate.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ThumbsDown className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Not Helpful</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data?.faqs.totalNotHelpful.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Resources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top Resources</h2>
          </div>

          {data?.resources.topResources.length === 0 ? (
            <p className="text-gray-500 text-sm">No resource data yet</p>
          ) : (
            <div className="space-y-3">
              {data?.resources.topResources.slice(0, 5).map((resource, index) => (
                <div key={resource.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
                    <span className="text-sm text-gray-900 truncate max-w-[200px]">
                      {resource.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Eye className="h-3 w-3" />
                      {resource.views}
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="h-3 w-3" />
                      {resource.helpful}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top FAQs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top FAQs</h2>
          </div>

          {data?.faqs.topFAQs.length === 0 ? (
            <p className="text-gray-500 text-sm">No FAQ data yet</p>
          ) : (
            <div className="space-y-3">
              {data?.faqs.topFAQs.slice(0, 5).map((faq, index) => (
                <div key={faq.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
                    <span className="text-sm text-gray-900 truncate max-w-[200px]">
                      {faq.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="h-3 w-3" />
                      {faq.helpful}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <ThumbsDown className="h-3 w-3" />
                      {faq.notHelpful}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Add Analytics to admin sidebar**

Update `src/app/(app)/admin/layout.tsx` to include Analytics link.

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/(app)/admin/analytics/page.tsx
git commit -m "feat(admin): add analytics dashboard page"
```

---

## Phase 3D: Email Notifications

### Task 9: Install Resend

**Step 1: Install the package**

Run: `npm install resend`

**Step 2: Verify installation**

Run: `npm ls resend`
Expected: Shows version installed

**Step 3: Create Resend client**

Create file: `src/lib/email.ts`

```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Email would be sent to:', to, 'Subject:', subject)
    return { success: true, mock: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NestMatch <noreply@nestmatch.com>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}
```

**Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/email.ts
git commit -m "deps: add Resend for email notifications"
```

---

### Task 10: Create Email Templates

**Files:**
- Create: `src/lib/email-templates.ts`

**Step 1: Create email templates**

```typescript
export function questionAnsweredEmail({
  userName,
  question,
  faqUrl,
}: {
  userName: string
  question: string
  faqUrl: string
}) {
  return {
    subject: 'Your question has been answered - NestMatch',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">NestMatch</h1>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${userName},</h2>
            <p style="margin: 0 0 16px 0;">
              Great news! Your question has been answered and added to our FAQ.
            </p>
            <div style="background: white; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Your question:</p>
              <p style="margin: 8px 0 0 0; font-weight: 500;">${question}</p>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${faqUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
              View Answer
            </a>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 14px;">
            <p>Thank you for helping us improve NestMatch!</p>
          </div>
        </body>
      </html>
    `,
  }
}

export function questionReceivedEmail({
  userName,
  question,
}: {
  userName: string
  question: string
}) {
  return {
    subject: 'We received your question - NestMatch',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">NestMatch</h1>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${userName},</h2>
            <p style="margin: 0 0 16px 0;">
              Thank you for submitting your question! Our team will review it and may add it to our FAQ.
            </p>
            <div style="background: white; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Your question:</p>
              <p style="margin: 8px 0 0 0; font-weight: 500;">${question}</p>
            </div>
            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
              We'll notify you by email if your question gets answered.
            </p>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 14px;">
            <p>Thank you for using NestMatch!</p>
          </div>
        </body>
      </html>
    `,
  }
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/email-templates.ts
git commit -m "feat: add email templates for question notifications"
```

---

### Task 11: Integrate Email in Question Submission

**Files:**
- Modify: `src/app/api/resources/questions/route.ts`

**Step 1: Read current file**

Read the existing questions API route.

**Step 2: Add email notification**

Add call to send confirmation email after question submission.

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/resources/questions/route.ts
git commit -m "feat: send confirmation email on question submission"
```

---

### Task 12: Add Email to Admin Question Update

**Files:**
- Create: `src/app/api/admin/questions/[id]/route.ts`

**Step 1: Create API route with email notification**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import { questionAnsweredEmail } from '@/lib/email-templates'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json()

  // Get current question with user info
  const { data: question } = await supabase
    .from('submitted_questions')
    .select('*, profiles:user_id(name, email)')
    .eq('id', id)
    .single()

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // Update question
  const { data, error: updateError } = await supabase
    .from('submitted_questions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send email if status changed to 'answered' and we have answered_faq_id
  if (body.status === 'answered' && body.answered_faq_id && question.profiles?.email) {
    const faqUrl = `${process.env.NEXT_PUBLIC_APP_URL}/resources/faq#${body.answered_faq_id}`
    const emailContent = questionAnsweredEmail({
      userName: question.profiles.name || 'there',
      question: question.question,
      faqUrl,
    })

    await sendEmail({
      to: question.profiles.email,
      ...emailContent,
    })
  }

  return NextResponse.json(data)
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/admin/questions/[id]/route.ts
git commit -m "feat(api): send email when question is marked as answered"
```

---

## Phase 3E: Content Scheduling

### Task 13: Add Scheduling Fields to Database Types

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Read current file**

**Step 2: Add scheduling fields to Resource and FAQ types**

Add to Resource type:
```typescript
publish_at?: string | null
unpublish_at?: string | null
```

Add to FAQ type:
```typescript
publish_at?: string | null
unpublish_at?: string | null
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "types: add scheduling fields to Resource and FAQ types"
```

---

### Task 14: Update Resource Form with Scheduling

**Files:**
- Modify: `src/components/admin/resource-form.tsx`

**Step 1: Read current file**

**Step 2: Add scheduling inputs to the form**

Add to the Status section:
- Publish At datetime input
- Unpublish At datetime input

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/admin/resource-form.tsx
git commit -m "feat(admin): add content scheduling to resource form"
```

---

### Task 15: Update FAQ Form with Scheduling

**Files:**
- Modify: `src/components/admin/faq-form.tsx`

**Step 1: Read current file**

**Step 2: Add scheduling inputs to the form**

Similar to resource form, add datetime inputs for publish_at and unpublish_at.

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/admin/faq-form.tsx
git commit -m "feat(admin): add content scheduling to FAQ form"
```

---

### Task 16: Update API to Filter by Schedule

**Files:**
- Modify: `src/app/api/resources/route.ts`
- Modify: `src/app/api/resources/faqs/route.ts`

**Step 1: Update resources API to filter by schedule**

Add to WHERE clause:
```sql
(publish_at IS NULL OR publish_at <= NOW())
AND (unpublish_at IS NULL OR unpublish_at > NOW())
```

**Step 2: Update FAQs API similarly**

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/resources/route.ts src/app/api/resources/faqs/route.ts
git commit -m "feat(api): filter content by publish/unpublish schedule"
```

---

## Phase 3F: SEO and Metadata

### Task 17: Add Dynamic Metadata to Resource Pages

**Files:**
- Modify: `src/app/(app)/resources/guides/[slug]/page.tsx`

**Step 1: Read current file**

**Step 2: Add generateMetadata export**

```typescript
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: resource } = await (supabase as any)
    .from('resources')
    .select('title, excerpt, tags')
    .eq('slug', slug)
    .single()

  if (!resource) {
    return { title: 'Resource Not Found' }
  }

  return {
    title: `${resource.title} | NestMatch Resources`,
    description: resource.excerpt || `Learn about ${resource.title}`,
    keywords: resource.tags?.join(', '),
    openGraph: {
      title: resource.title,
      description: resource.excerpt,
      type: 'article',
    },
  }
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/(app)/resources/guides/[slug]/page.tsx
git commit -m "feat(seo): add dynamic metadata to resource pages"
```

---

### Task 18: Add Metadata to FAQ Page

**Files:**
- Modify: `src/app/(app)/resources/faq/page.tsx`

**Step 1: Read current file**

**Step 2: Add static metadata export**

```typescript
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ | NestMatch Resources',
  description: 'Find answers to frequently asked questions about renting, roommates, and tenant rights in Canada.',
  openGraph: {
    title: 'Frequently Asked Questions',
    description: 'Find answers to frequently asked questions about renting, roommates, and tenant rights.',
  },
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/(app)/resources/faq/page.tsx
git commit -m "feat(seo): add metadata to FAQ page"
```

---

### Task 19: Add Structured Data for FAQs

**Files:**
- Modify: `src/app/(app)/resources/faq/page.tsx`

**Step 1: Add JSON-LD structured data**

Add FAQ schema markup for better SEO:

```tsx
// Add to component
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

// Add to JSX
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
/>
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(app)/resources/faq/page.tsx
git commit -m "feat(seo): add FAQ structured data for search engines"
```

---

### Task 20: Final Build and Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Create final commit**

```bash
git add -A
git commit -m "feat: complete Phase 3 - admin clauses, PDF, analytics, email, scheduling, SEO"
```

---

## Database Migrations Required

Before implementing, add these migrations in Supabase:

```sql
-- Add scheduling fields to resources
ALTER TABLE resources
ADD COLUMN publish_at TIMESTAMPTZ,
ADD COLUMN unpublish_at TIMESTAMPTZ;

-- Add scheduling fields to faqs
ALTER TABLE faqs
ADD COLUMN publish_at TIMESTAMPTZ,
ADD COLUMN unpublish_at TIMESTAMPTZ;

-- Add index for scheduling queries
CREATE INDEX idx_resources_publish_at ON resources(publish_at) WHERE publish_at IS NOT NULL;
CREATE INDEX idx_faqs_publish_at ON faqs(publish_at) WHERE publish_at IS NOT NULL;
```

---

## Environment Variables Required

Add to `.env.local`:

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=NestMatch <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Verification Checklist

1. [ ] Agreement clauses admin: list, create, edit, delete
2. [ ] PDF generation: download works, includes all clauses
3. [ ] Analytics: views and helpful counts display correctly
4. [ ] Email: confirmation sent on question submission
5. [ ] Email: notification sent when question answered
6. [ ] Scheduling: resources with future publish_at don't appear
7. [ ] SEO: metadata appears in page source
8. [ ] SEO: FAQ structured data validates at schema.org
9. [ ] Build passes: `npm run build` succeeds
10. [ ] Type check passes: `npx tsc --noEmit` succeeds
