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
  { value: 'basics', label: 'Basics' },
  { value: 'financial', label: 'Financial' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'responsibilities', label: 'Responsibilities' },
  { value: 'termination', label: 'Termination' },
]

const QUESTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
]

interface ClauseQuestion {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  options?: string[]
  required: boolean
}

interface ClauseFormProps {
  clause?: AgreementClause
  isEditing?: boolean
}

export function ClauseForm({ clause, isEditing = false }: ClauseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    clause_key: clause?.clause_key || '',
    title: clause?.title || '',
    description: clause?.description || '',
    category: clause?.category || 'basics',
    content_template: typeof clause?.content_template === 'string'
      ? clause.content_template
      : '',
    provinces: clause?.provinces || [],
    is_required: clause?.is_required ?? false,
    is_active: clause?.is_active ?? true,
    display_order: clause?.display_order ?? 0,
  })

  const [questions, setQuestions] = useState<ClauseQuestion[]>(
    Array.isArray(clause?.question_flow)
      ? (clause.question_flow as unknown as ClauseQuestion[])
      : []
  )

  const toggleProvince = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      provinces: prev.provinces.includes(code)
        ? prev.provinces.filter((p) => p !== code)
        : [...prev.provinces, code],
    }))
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        key: '',
        label: '',
        type: 'text',
        options: [],
        required: false,
      },
    ])
  }

  const updateQuestion = (index: number, updates: Partial<ClauseQuestion>) => {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, ...updates } : q))
    )
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const addOption = (questionIndex: number) => {
    setQuestions(
      questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...(q.options || []), ''] }
          : q
      )
    )
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options?.map((opt, j) =>
                j === optionIndex ? value : opt
              ),
            }
          : q
      )
    )
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(
      questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options?.filter((_, j) => j !== optionIndex) }
          : q
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const clauseData = {
      clause_key: formData.clause_key,
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      content_template: formData.content_template,
      provinces: formData.provinces,
      question_flow: questions,
      is_required: formData.is_required,
      is_active: formData.is_active,
      display_order: formData.display_order,
    }

    try {
      if (isEditing && clause) {
        const { error } = await (supabase as any)
          .from('agreement_clauses')
          .update(clauseData)
          .eq('id', clause.id)

        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('agreement_clauses')
          .insert(clauseData)

        if (error) throw error
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
              {isEditing ? 'Update this agreement clause' : 'Create a new agreement clause'}
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
        {/* Main Content - Left Side (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clause Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Clause Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clause Key *
                </label>
                <input
                  type="text"
                  value={formData.clause_key}
                  onChange={(e) =>
                    setFormData({ ...formData, clause_key: e.target.value })
                  }
                  required
                  pattern="[a-z_]+"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., rent_payment_terms"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier in snake_case (lowercase letters and underscores only)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Rent Payment Terms"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of what this clause covers..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Template *
                </label>
                <textarea
                  value={formData.content_template}
                  onChange={(e) =>
                    setFormData({ ...formData, content_template: e.target.value })
                  }
                  required
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="The tenant agrees to pay {{rent_amount}} on the {{payment_day}} of each month..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{{variable}}'} placeholders for dynamic content. These will be replaced with user answers.
                </p>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No questions added yet. Click &quot;Add Question&quot; to create one.
              </p>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        Question {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Key *
                        </label>
                        <input
                          type="text"
                          value={question.key}
                          onChange={(e) =>
                            updateQuestion(index, { key: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="rent_amount"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type *
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            updateQuestion(index, {
                              type: e.target.value as ClauseQuestion['type'],
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {QUESTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        value={question.label}
                        onChange={(e) =>
                          updateQuestion(index, { label: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="What is the monthly rent amount?"
                      />
                    </div>

                    {question.type === 'select' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Options
                        </label>
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  updateOption(index, optIndex, e.target.value)
                                }
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(index, optIndex)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOption(index)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add option
                          </button>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) =>
                          updateQuestion(index, { required: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Required</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Right Side (1/3) */}
        <div className="space-y-6">
          {/* Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) =>
                    setFormData({ ...formData, is_required: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Required in all agreements</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
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
