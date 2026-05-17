"use client"

import { useState, useMemo } from "react"
import { useNcUnitedCalendarEvents } from "@/hooks/use-nc-united-calendar-events"
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"
import type { CalendarEvent, EventCategory } from "@/lib/nc-united-calendar/types"
import { CalendarAdminBanner } from "@/components/nc-united-calendar/calendar-admin-banner"
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Filter, List, Grid3X3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function formatTime(time: string | null | undefined): string {
  if (!time) return ""
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDateRange(event: CalendarEvent): string {
  const start = event.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (event.endDate && event.endDate.getTime() !== event.date.getTime()) {
    const end = event.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${start} - ${end}`
  }
  return start
}

export default function CalendarPage() {
  const { events, loading, error } = useNcUnitedCalendarEvents()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "list">("list")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [visibleCategories, setVisibleCategories] = useState<Set<EventCategory>>(
    new Set(Object.keys(eventCategories) as EventCategory[])
  )
  const [showFilters, setShowFilters] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const filteredEvents = useMemo(() => {
    return (events || []).filter((e) => visibleCategories.has(e.category as EventCategory))
  }, [events, visibleCategories])

  const eventsThisMonth = useMemo(() => {
    return filteredEvents.filter((e) => e.date.getFullYear() === year && e.date.getMonth() === month)
  }, [filteredEvents, year, month])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return filteredEvents
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 20)
  }, [filteredEvents])

  const handleCategoryToggle = (category: EventCategory) => {
    const next = new Set(visibleCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    setVisibleCategories(next)
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  // Generate calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const getEventsForDay = (day: number) => {
    return eventsThisMonth.filter((e) => e.date.getDate() === day)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#D3B574]" />
          <span className="text-gray-300">Loading calendar...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading calendar: {error}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628]">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <CalendarAdminBanner />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574] mb-2">NC United Wrestling</p>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Calendar</h1>
          <p className="text-gray-400 mt-2 max-w-xl">
            Practices, tournaments, and community events for NC wrestling.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold text-white min-w-[160px] text-center">
              {MONTHS[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* View Toggle & Filter */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "text-gray-400 hover:text-white hover:bg-[#1e3a5f]",
                showFilters && "bg-[#1e3a5f] text-white"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <div className="flex rounded-lg bg-[#0F1E32] border border-[#1e3a5f] p-1">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === "list" ? "bg-[#D3B574] text-[#0A1628]" : "text-gray-400 hover:text-white"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("month")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === "month" ? "bg-[#D3B574] text-[#0A1628]" : "text-gray-400 hover:text-white"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 rounded-xl bg-[#0F1E32] border border-[#1e3a5f]">
            <p className="text-sm font-medium text-gray-400 mb-3">Event Categories</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(eventCategories) as EventCategory[]).map((cat) => {
                const config = eventCategories[cat]
                const isActive = visibleCategories.has(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryToggle(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                      isActive
                        ? "bg-[#D3B574] text-[#0A1628] border-[#D3B574]"
                        : "bg-transparent text-gray-400 border-[#1e3a5f] hover:border-gray-500"
                    )}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Content */}
        {view === "list" ? (
          /* List View */
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No upcoming events found.
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left p-4 rounded-xl bg-[#0F1E32] border border-[#1e3a5f] hover:border-[#D3B574]/50 transition-colors group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-2xl font-bold text-white">{event.date.getDate()}</div>
                      <div className="text-xs text-gray-500 uppercase">
                        {event.date.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                    </div>
                    
                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: eventCategories[event.category as EventCategory]?.color || "#D3B574" }}
                        />
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {eventCategories[event.category as EventCategory]?.label || event.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-[#D3B574] transition-colors truncate">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                        {event.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(event.startTime)}
                            {event.endTime && ` - ${formatTime(event.endTime)}`}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Month View */
          <div className="rounded-xl bg-[#0F1E32] border border-[#1e3a5f] overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-[#1e3a5f]">
              {DAYS.map((day) => (
                <div key={day} className="py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  const dayEvents = day ? getEventsForDay(day) : []
                  const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString()
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className={cn(
                        "min-h-[80px] md:min-h-[100px] p-1 md:p-2 border-b border-r border-[#1e3a5f]",
                        !day && "bg-[#0A1628]/50"
                      )}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            isToday ? "text-[#D3B574]" : "text-white"
                          )}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((event) => (
                              <button
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: eventCategories[event.category as EventCategory]?.color || "#D3B574", color: "white" }}
                              >
                                {event.title}
                              </button>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-white px-1">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full sm:max-w-lg mx-auto bg-[#0F1E32] rounded-t-2xl sm:rounded-2xl border border-[#1e3a5f] max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: eventCategories[selectedEvent.category as EventCategory]?.color || "#D3B574" }}
                />
                <span className="text-sm text-gray-400">
                  {eventCategories[selectedEvent.category as EventCategory]?.label || selectedEvent.category}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">{selectedEvent.title}</h2>
              
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#D3B574]" />
                  <span>{formatDateRange(selectedEvent)}</span>
                </div>
                
                {selectedEvent.startTime && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#D3B574]" />
                    <span>
                      {formatTime(selectedEvent.startTime)}
                      {selectedEvent.endTime && ` - ${formatTime(selectedEvent.endTime)}`}
                    </span>
                  </div>
                )}
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#D3B574]" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <p className="pt-3 border-t border-[#1e3a5f] text-gray-400">
                    {selectedEvent.description}
                  </p>
                )}

                {selectedEvent.coach && (
                  <p className="text-sm text-gray-500">
                    Coach: <span className="text-gray-400">{selectedEvent.coach}</span>
                  </p>
                )}
              </div>
              
              <div className="mt-6 flex gap-3">
                {selectedEvent.externalLink && (
                  <a
                    href={selectedEvent.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-lg bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold text-center transition-colors"
                  >
                    Register
                  </a>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 py-2.5 rounded-lg border border-[#1e3a5f] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
