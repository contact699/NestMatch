'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, DollarSign, Share2, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Room {
  id: string
  name: string
  type: string
  sqft: number
  hasEnsuite: boolean
  hasBalcony: boolean
  hasCloset: boolean
  hasAC: boolean
}

const DEFAULT_ROOMS: Room[] = [
  { id: '1', name: 'Master Suite', type: 'PRIMARY ROOM', sqft: 180, hasEnsuite: true, hasBalcony: true, hasCloset: true, hasAC: false },
  { id: '2', name: 'Standard Room', type: 'SECONDARY ROOM', sqft: 120, hasEnsuite: false, hasBalcony: false, hasCloset: true, hasAC: false },
]

const AMENITIES = [
  { key: 'hasBalcony', label: 'Private Balcony', icon: '🌇' },
  { key: 'hasCloset', label: 'Walk-in Closet', icon: '👔' },
  { key: 'hasAC', label: 'AC Unit', icon: '❄️' },
]

// Amenity weights for fair calculation
const AMENITY_WEIGHTS = {
  ensuite: 150,
  balcony: 75,
  closet: 25,
  ac: 50,
}

export default function RentCalculatorPage() {
  const [totalRent, setTotalRent] = useState(3200)
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS)

  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: `Room ${rooms.length + 1}`,
      type: 'SECONDARY ROOM',
      sqft: 100,
      hasEnsuite: false,
      hasBalcony: false,
      hasCloset: false,
      hasAC: false,
    }
    setRooms([...rooms, newRoom])
  }

  const removeRoom = (id: string) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((r) => r.id !== id))
    }
  }

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  // Square Footage + Amenity Weighted calculation
  const calculateRents = () => {
    const roomValues = rooms.map((r) => {
      let value = r.sqft
      if (r.hasEnsuite) value += AMENITY_WEIGHTS.ensuite
      if (r.hasBalcony) value += AMENITY_WEIGHTS.balcony
      if (r.hasCloset) value += AMENITY_WEIGHTS.closet
      if (r.hasAC) value += AMENITY_WEIGHTS.ac
      return { ...r, value }
    })

    const totalValue = roomValues.reduce((sum, r) => sum + r.value, 0)
    return roomValues.map((r) => ({
      ...r,
      rent: totalValue > 0 ? (r.value / totalValue) * totalRent : 0,
      weight: totalValue > 0 ? (r.value / totalValue) * 100 : 0,
    }))
  }

  const results = calculateRents()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/resources/tools"
          className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-surface">
          Fair Share Calculator
        </h1>
        <p className="mt-2 text-on-surface-variant max-w-2xl">
          Splitting rent shouldn&apos;t be a source of stress. Our algorithm calculates
          individual costs based on room size, private amenities, and shared value.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Property Rent */}
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-6">
            <h2 className="font-display font-semibold text-on-surface mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-secondary" />
              Total Property Rent
            </h2>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium">$</span>
              <Input
                type="number"
                value={totalRent}
                onChange={(e) => setTotalRent(Number(e.target.value) || 0)}
                className="pl-8 text-lg h-12"
                min={0}
              />
            </div>
          </div>

          {/* Define the Sanctuary */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold text-on-surface">
                Define the Sanctuary
              </h2>
              <Button variant="outline" size="sm" onClick={addRoom}>
                <Plus className="h-4 w-4 mr-1" />
                Add Another Room
              </Button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <div
                  key={room.id}
                  className="bg-surface-container-lowest ghost-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full ghost-border flex items-center justify-center text-sm font-semibold text-on-surface-variant">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                          className="font-display font-semibold text-on-surface bg-transparent outline-none focus:bg-surface-container focus:px-2 focus:py-1 focus:rounded-lg focus:ring-2 focus:ring-secondary/30"
                        />
                        <p className="text-xs text-on-surface-variant uppercase tracking-wider">
                          {room.type}
                        </p>
                      </div>
                    </div>
                    {rooms.length > 1 && (
                      <button
                        onClick={() => removeRoom(room.id)}
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-on-surface-variant block mb-1 font-medium">
                        Room Size (sq ft)
                      </label>
                      <Input
                        type="number"
                        value={room.sqft}
                        onChange={(e) =>
                          updateRoom(room.id, { sqft: Number(e.target.value) || 0 })
                        }
                        min={0}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-on-surface-variant block mb-1 font-medium">
                        Private Bathroom
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateRoom(room.id, { hasEnsuite: true })}
                          className={`flex-1 py-2 text-sm rounded-lg ghost-border transition-colors ${
                            room.hasEnsuite
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          Ensuite
                        </button>
                        <button
                          onClick={() => updateRoom(room.id, { hasEnsuite: false })}
                          className={`flex-1 py-2 text-sm rounded-lg ghost-border transition-colors ${
                            !room.hasEnsuite
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          Shared
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Amenity pills */}
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((amenity) => (
                      <label
                        key={amenity.key}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full cursor-pointer transition-colors ghost-border
                          ${(room as any)[amenity.key]
                            ? 'bg-secondary-container text-secondary'
                            : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={(room as any)[amenity.key]}
                          onChange={(e) =>
                            updateRoom(room.id, { [amenity.key]: e.target.checked })
                          }
                          className="sr-only"
                        />
                        <span>{amenity.icon}</span>
                        {amenity.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Split Breakdown */}
          <div className="bg-primary text-on-primary rounded-xl p-6 sticky top-4">
            <h2 className="font-display font-semibold text-lg mb-4">Split Breakdown</h2>
            <div className="space-y-3">
              {results.map((room, index) => (
                <div
                  key={room.id}
                  className="bg-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-on-primary/70 uppercase">
                      Room {String(index + 1).padStart(2, '0')} - {room.name.split(' ')[0]}
                    </span>
                    <span className="text-xs text-on-primary/70">
                      WEIGHT
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-bold">
                        ${(room.rent || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </span>
                      {room.hasEnsuite && (
                        <span className="text-xs text-secondary-container">+ Premium</span>
                      )}
                    </div>
                    <span className="text-lg font-semibold">
                      {room.weight.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-primary/70">Monthly Total</span>
                <span className="text-2xl font-display font-bold">
                  ${totalRent.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-on-primary hover:bg-white/20"
              >
                <Share2 className="h-4 w-4 mr-1" />
              </Button>
              <Button className="flex-1 bg-white text-primary hover:bg-white/90">
                <FileText className="h-4 w-4 mr-2" />
                Create Split Agreement
              </Button>
            </div>
          </div>

          {/* Fairness Methodology */}
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-5">
            <h3 className="font-display font-semibold text-on-surface mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              Fairness Methodology
            </h3>
            <p className="text-sm text-on-surface-variant">
              We use the <strong className="text-on-surface">Square Footage + Amenity Weighted</strong> method.
              Common areas are split equally, while private square footage and exclusive
              amenities are calculated by premium ratio.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
