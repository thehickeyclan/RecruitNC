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
import { CalendarLoadingSkeleton } from "@/components/nc-united-calendar/calendar-loading-skeleton"

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

  const y = currentDate.getFullYear()
  const m = currentDate.getMonth()
  const eventsThisMonth = filteredEvents.filter((e) => {
    const d = e.date
    return d.getFullYear() === y && d.getMonth() === m
  }).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/80">
        <CalendarLoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
        <div className="max-w-md text-center">
          <p className="mb-4 rounded-xl border border-nc-red-200 bg-nc-red-50 px-4 py-3 text-sm text-nc-red-800">
            Error loading calendar: {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-nc-navy-950 px-4 py-2 text-white shadow-sm transition-colors hover:bg-nc-navy-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(179,27,27,0.06),transparent),radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(0,51,102,0.05),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <CalendarAdminBanner />
        <header className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-nc-red/90 sm:text-xs">
            NC United Wrestling
          </p>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-nc-navy-900 sm:text-6xl sm:tracking-tighter">
            Calendar<span className="text-nc-red">NC</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Practices, tournaments, and community events — built for the{" "}
            <span className="font-semibold text-nc-navy-900">NC</span> wrestling community.
          </p>
        </header>

        <CalendarHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          view={view}
          onViewChange={setView}
          eventsThisMonth={eventsThisMonth}
        />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <EventLegend visibleCategories={visibleCategories} onCategoryToggle={handleCategoryToggle} />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 lg:col-span-3">
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
