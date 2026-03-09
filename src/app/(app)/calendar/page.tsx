'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useFetch } from '@/lib/hooks/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FetchError } from '@/components/ui/fetch-error'
import { toast } from 'sonner'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  HelpCircle,
  X,
} from 'lucide-react'

interface ChatEvent {
  id: string
  conversation_id: string
  created_by: string
  title: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
  status: 'proposed' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const eventsUrl = useMemo(() => {
    const m = currentMonth.getMonth() + 1
    const y = currentMonth.getFullYear()
    return `/api/events?month=${m}&year=${y}`
  }, [currentMonth])

  const { data, isLoading, error, refetch } = useFetch<{ events: ChatEvent[] }>(eventsUrl)
  const events = data?.events || []

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e) => e.event_date === dateStr)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'declined':
        return <XCircle className="h-3 w-3 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-3 w-3 text-gray-400" />
      default:
        return <HelpCircle className="h-3 w-3 text-yellow-500" />
    }
  }

  const [selectedEvent, setSelectedEvent] = useState<ChatEvent | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const handleEventAction = useCallback(
    async (event: ChatEvent, status: 'accepted' | 'declined' | 'cancelled') => {
      try {
        const res = await fetch(`/api/conversations/${event.conversation_id}/events`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: event.id, status }),
        })
        if (!res.ok) throw new Error('Failed to update event')
        toast.success(`Event ${status}`)
        setSelectedEvent(null)
        refetch()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to update event')
      }
    },
    [refetch]
  )

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEvent(null)
    }
    if (selectedEvent) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedEvent])

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const today = new Date()
  const isCurrentMonth =
    currentMonth.getMonth() === today.getMonth() &&
    currentMonth.getFullYear() === today.getFullYear()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">Your scheduled meetups</p>
        </div>
      </div>

      {error ? (
        <FetchError message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <CardTitle>
                {currentMonth.toLocaleDateString('en-CA', {
                  month: 'long',
                  year: 'numeric',
                })}
              </CardTitle>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50 min-h-[80px] p-1" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDate(day)
                const isToday = isCurrentMonth && day === today.getDate()

                return (
                  <div
                    key={day}
                    className={`bg-white min-h-[80px] p-1 ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                  >
                    <span
                      className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className="flex items-center gap-1 px-1 py-0.5 bg-blue-50 hover:bg-blue-100 rounded text-xs truncate w-full text-left transition-colors cursor-pointer"
                          title={`${event.title} at ${event.start_time}`}
                          onClick={() => setSelectedEvent(event)}
                        >
                          {getStatusIcon(event.status)}
                          <span className="truncate">{event.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-xs text-gray-400 px-1">
                          +{dayEvents.length - 2} more
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Upcoming events list */}
            {events.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Upcoming events</h3>
                <div className="space-y-3">
                  {events.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(event.event_date + 'T00:00:00').toLocaleDateString(
                              'en-CA',
                              {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.start_time}
                            {event.end_time && ` - ${event.end_time}`}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.status === 'proposed' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => handleEventAction(event, 'accepted')}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEventAction(event, 'declined')}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          event.status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'declined'
                              ? 'bg-red-100 text-red-700'
                              : event.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvent(null)
          }}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>

            <div className="pr-8">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(selectedEvent.status)}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedEvent.status === 'accepted'
                      ? 'bg-green-100 text-green-700'
                      : selectedEvent.status === 'declined'
                        ? 'bg-red-100 text-red-700'
                        : selectedEvent.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {selectedEvent.status}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {selectedEvent.title}
              </h2>
            </div>

            {selectedEvent.description && (
              <p className="text-sm text-gray-600 mb-4">{selectedEvent.description}</p>
            )}

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>
                  {new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString('en-CA', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>
                  {selectedEvent.start_time}
                  {selectedEvent.end_time && ` - ${selectedEvent.end_time}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
            </div>

            {selectedEvent.status === 'proposed' && (
              <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEventAction(selectedEvent, 'accepted')}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEventAction(selectedEvent, 'declined')}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
