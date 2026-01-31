'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Plus, Trash2, DollarSign, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Room {
  id: string
  name: string
  sqft: number
  hasPrivateBath: boolean
  hasBalcony: boolean
  hasCloset: boolean
  hasWindow: boolean
}

const DEFAULT_ROOMS: Room[] = [
  { id: '1', name: 'Room 1', sqft: 120, hasPrivateBath: false, hasBalcony: false, hasCloset: true, hasWindow: true },
  { id: '2', name: 'Room 2', sqft: 100, hasPrivateBath: false, hasBalcony: false, hasCloset: true, hasWindow: true },
]

export default function RentCalculatorPage() {
  const [totalRent, setTotalRent] = useState(2000)
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS)
  const [method, setMethod] = useState<'equal' | 'sqft' | 'amenities'>('sqft')

  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: `Room ${rooms.length + 1}`,
      sqft: 100,
      hasPrivateBath: false,
      hasBalcony: false,
      hasCloset: true,
      hasWindow: true,
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

  const calculateRents = () => {
    if (method === 'equal') {
      const perRoom = totalRent / rooms.length
      return rooms.map((r) => ({ ...r, rent: perRoom }))
    }

    if (method === 'sqft') {
      const totalSqft = rooms.reduce((sum, r) => sum + r.sqft, 0)
      return rooms.map((r) => ({
        ...r,
        rent: (r.sqft / totalSqft) * totalRent,
      }))
    }

    // Amenities-based: sqft + bonuses for amenities
    const AMENITY_WEIGHTS = {
      privateBath: 150,
      balcony: 75,
      closet: 25,
      window: 50,
    }

    const roomValues = rooms.map((r) => {
      let value = r.sqft
      if (r.hasPrivateBath) value += AMENITY_WEIGHTS.privateBath
      if (r.hasBalcony) value += AMENITY_WEIGHTS.balcony
      if (r.hasCloset) value += AMENITY_WEIGHTS.closet
      if (r.hasWindow) value += AMENITY_WEIGHTS.window
      return { ...r, value }
    })

    const totalValue = roomValues.reduce((sum, r) => sum + r.value, 0)
    return roomValues.map((r) => ({
      ...r,
      rent: (r.value / totalValue) * totalRent,
    }))
  }

  const results = calculateRents()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/resources/tools"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-7 w-7 text-blue-600" />
          Rent Split Calculator
        </h1>
        <p className="mt-1 text-gray-600">
          Calculate fair rent splits based on room size and amenities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Rent */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-base">Total Monthly Rent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="number"
                  value={totalRent}
                  onChange={(e) => setTotalRent(Number(e.target.value) || 0)}
                  className="pl-10 text-lg"
                  min={0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Calculation Method */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-base">Calculation Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'equal', label: 'Equal Split', desc: 'Same rent for everyone' },
                  { id: 'sqft', label: 'By Square Feet', desc: 'Based on room size' },
                  { id: 'amenities', label: 'With Amenities', desc: 'Size + features' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id as any)}
                    className={`
                      p-3 rounded-lg border-2 text-left transition-colors
                      ${method === m.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <p className="font-medium text-sm text-gray-900">{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rooms */}
          <Card variant="bordered">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rooms</CardTitle>
              <Button variant="outline" size="sm" onClick={addRoom}>
                <Plus className="h-4 w-4 mr-1" />
                Add Room
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {rooms.map((room, index) => (
                <div
                  key={room.id}
                  className="p-4 bg-gray-50 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                      className="font-medium bg-transparent border-none outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded focus:ring-2 focus:ring-blue-100"
                    />
                    {rooms.length > 1 && (
                      <button
                        onClick={() => removeRoom(room.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">
                        Square Feet
                      </label>
                      <Input
                        type="number"
                        value={room.sqft}
                        onChange={(e) =>
                          updateRoom(room.id, { sqft: Number(e.target.value) || 0 })
                        }
                        min={0}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {method === 'amenities' && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'hasPrivateBath', label: 'Private Bath' },
                        { key: 'hasBalcony', label: 'Balcony' },
                        { key: 'hasCloset', label: 'Closet' },
                        { key: 'hasWindow', label: 'Window' },
                      ].map((amenity) => (
                        <label
                          key={amenity.key}
                          className={`
                            px-3 py-1.5 text-xs rounded-full cursor-pointer transition-colors
                            ${(room as any)[amenity.key]
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
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
                          {amenity.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          <Card variant="bordered" className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
              <CardDescription>Suggested rent per room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{room.name}</p>
                    <p className="text-xs text-gray-500">{room.sqft} sq ft</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-blue-600">
                      ${(room as any).rent?.toFixed(0) || 0}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(((room as any).rent || 0) / totalRent * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${totalRent.toFixed(0)}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setRooms(DEFAULT_ROOMS)
                  setTotalRent(2000)
                  setMethod('sqft')
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tips */}
      <Card variant="bordered" className="mt-6">
        <CardContent className="py-4">
          <h3 className="font-medium text-gray-900 mb-2">Tips for Fair Splitting</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Measure rooms accurately - square footage should include only livable space</li>
            <li>• Consider natural light, closet space, and noise levels when adjusting</li>
            <li>• Private bathrooms typically justify 10-15% higher rent</li>
            <li>• Discuss and agree on the method before signing anything</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
