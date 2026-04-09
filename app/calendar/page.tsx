"use client"

import { useState } from "react"
import { CalendarHeader } from "@/components/nc-united-calendar/calendar-header"
import { MonthView } from "@/components/nc-united-calendar/calendar-views/month-view"
import { ListView } from "@/components/nc-united-calendar/calendar-views/list-view"
import { EventLegend } from "@/components/nc-united-calendar/event-legend"
import { EventDetailModal } from "@/components/nc-united-calendar/event-detail-modal"
import { useNcUnitedCalendarEvents } from "@/hooks/use-nc-united-calendar-events"
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"
import type { CalendarEvent, EventCategory } from "@/lib/nc-united-calendar/types"
import { CalendarAdminBanner } from "@/components/nc-united-calendar/calendar-admin-banner"

export default function NcUnitedCalendarPage() {
  const { events, loading, error } = useNcUnitedCalendarEvents()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "list">("month")
  const [visibleCategories, setVisibleCategories] = useState<Set<EventCategory>>(
    new Set(Object.keys(eventCategories) as EventCategory[]),
  )
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const handleCategoryToggle = (category: EventCategory) => {
    const next = new Set(visibleCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    setVisibleCategories(next)
  }

  const filteredEvents = events?.filter((e) => visibleCategories.has(e.category as EventCategory)) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nc-navy-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading calendar: {error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-nc-navy-600 text-white rounded hover:bg-nc-navy-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CalendarAdminBanner />
        <div className="mb-8 text-center">
          <h1 className="text-6xl font-extrabold mb-3 tracking-tight">
            <span className="text-nc-navy-900">Calendar</span>
            <span className="text-nc-red-600">NC</span>
          </h1>
          <p className="text-gray-600 text-xl font-medium">
            Powered by <span className="font-bold text-nc-navy-600">NC</span>{" "}
            <span className="font-bold text-nc-red-600">United</span>. Built for the entire{" "}
            <span className="font-bold text-nc-navy-600">NC</span> wrestling community.
          </p>
        </div>

        <CalendarHeader currentDate={currentDate} onDateChange={setCurrentDate} view={view} onViewChange={setView} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-1">
            <EventLegend visibleCategories={visibleCategories} onCategoryToggle={handleCategoryToggle} />
          </div>

          <div className="lg:col-span-3">
            {view === "month" ? (
              <MonthView currentDate={currentDate} events={filteredEvents} onEventClick={setSelectedEvent} />
            ) : (
              <ListView
                events={filteredEvents}
                onEventClick={setSelectedEvent}
                currentDate={currentDate}
                visibleCategories={visibleCategories}
              />
            )}
          </div>
        </div>

        {selectedEvent && (
          <EventDetailModal event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </div>
    </div>
  )
}
