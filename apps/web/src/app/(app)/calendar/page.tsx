'use client'

import { useState } from 'react'
import { useFetch } from '@/lib/hooks/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FetchError } from '@/components/ui/fetch-error'
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

  const { data, isLoading, error, refetch } = useFetch<{ events: ChatEvent[] }>('/api/events')
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
        return <CheckCircle className="h-3 w-3 text-secondary" />
      case 'declined':
        return <XCircle className="h-3 w-3 text-error" />
      case 'cancelled':
        return <XCircle className="h-3 w-3 text-outline" />
      default:
        return <HelpCircle className="h-3 w-3 text-tertiary-container" />
    }
  }

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
          <h1 className="text-2xl font-bold font-display text-on-surface">Calendar</h1>
          <p className="text-on-surface-variant">Your scheduled meetups</p>
        </div>
      </div>

      {error ? (
        <FetchError message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 hover:bg-surface-container-low rounded-lg">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <CardTitle>
                {currentMonth.toLocaleDateString('en-CA', {
                  month: 'long',
                  year: 'numeric',
                })}
              </CardTitle>
              <button onClick={nextMonth} className="p-2 hover:bg-surface-container-low rounded-lg">
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
                  className="text-center text-xs font-medium text-on-surface-variant py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-surface-container rounded-lg overflow-hidden">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-surface-container-low min-h-[80px] p-1" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDate(day)
                const isToday = isCurrentMonth && day === today.getDate()

                return (
                  <div
                    key={day}
                    className={`bg-surface-container-lowest min-h-[80px] p-1 ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                  >
                    <span
                      className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-1 px-1 py-0.5 bg-primary-fixed rounded text-xs truncate"
                          title={`${event.title} at ${event.start_time}`}
                        >
                          {getStatusIcon(event.status)}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-xs text-outline px-1">
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
                <h3 className="font-semibold text-on-surface mb-3">Upcoming events</h3>
                <div className="space-y-3">
                  {events.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-surface text-sm">{event.title}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-on-surface-variant">
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
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          event.status === 'accepted'
                            ? 'bg-secondary-container text-secondary'
                            : event.status === 'declined'
                              ? 'bg-error-container text-error'
                              : event.status === 'cancelled'
                                ? 'bg-surface-container-low text-on-surface-variant'
                                : 'bg-tertiary-fixed text-tertiary-container'
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
    </div>
  )
}
