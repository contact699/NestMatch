'use client'

import Link from 'next/link'
import { Wrench, Calculator, CheckSquare, ArrowRight } from 'lucide-react'

const TOOLS = [
  {
    title: 'Rent Split Calculator',
    description: 'Calculate fair rent splits based on room size, amenities, and other factors',
    href: '/resources/tools/rent-calculator',
    icon: Calculator,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Move-In Checklist',
    description: 'Interactive checklist to help you prepare for moving day and settling in',
    href: '/resources/tools/move-in-checklist',
    icon: CheckSquare,
    color: 'bg-green-50 text-green-600',
  },
]

export default function ToolsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="h-7 w-7 text-purple-600" />
          Tools
        </h1>
        <p className="mt-1 text-gray-600">
          Helpful calculators and checklists for roommates
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group block bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className={`w-14 h-14 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
              <tool.icon className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {tool.title}
            </h2>
            <p className="text-gray-500 mt-2">{tool.description}</p>
            <div className="flex items-center gap-1 mt-4 text-sm text-blue-600 font-medium">
              <span>Open tool</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* More tools coming soon */}
      <div className="mt-12 text-center">
        <p className="text-gray-500">
          More tools coming soon! Have a suggestion?{' '}
          <Link href="/resources/submit-question" className="text-blue-600 hover:underline">
            Let us know
          </Link>
        </p>
      </div>
    </div>
  )
}
