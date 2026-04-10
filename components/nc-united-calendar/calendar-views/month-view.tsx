"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { CalendarEvent } from "@/lib/nc-united-calendar/types"
import { startOfLocalCalendarDay } from "@/lib/nc-united-calendar/calendar-date"
import { formatTime } from "@/lib/nc-united-calendar/time-utils"
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export function MonthView({ currentDate, events, onEventClick }: MonthViewProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time for accurate date comparison
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and calculate calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday

  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())) // End on Saturday

  const days = []
  const currentDay = new Date(startDate)

  while (currentDay <= endDate) {
    days.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventStartDate = startOfLocalCalendarDay(new Date(event.date))
      const eventEndDate = event.endDate ? startOfLocalCalendarDay(new Date(event.endDate)) : eventStartDate

      const currentDateOnly = startOfLocalCalendarDay(date)
      const startDateOnly = eventStartDate
      const endDateOnly = eventEndDate

      return currentDateOnly >= startDateOnly && currentDateOnly <= endDateOnly
    })
  }

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPastDate = (date: Date) => {
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    return dateOnly < today
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  const isMultiDayEvent = (event: CalendarEvent) => {
    if (!event.endDate) return false
    const startDate = startOfLocalCalendarDay(new Date(event.date))
    const endDate = startOfLocalCalendarDay(new Date(event.endDate))
    return startDate.getTime() !== endDate.getTime()
  }

  const getMultiDayIndicator = (event: CalendarEvent, currentDate: Date) => {
    if (!isMultiDayEvent(event)) return ""

    const eventStartDate = startOfLocalCalendarDay(new Date(event.date))
    const eventEndDate = startOfLocalCalendarDay(new Date(event.endDate!))
    const currentDateOnly = startOfLocalCalendarDay(currentDate)
    const startDateOnly = eventStartDate
    const endDateOnly = eventEndDate

    if (currentDateOnly.getTime() === startDateOnly.getTime()) return " (Day 1)"
    if (currentDateOnly.getTime() === endDateOnly.getTime()) return " (Final)"
    return " (Cont.)"
  }

  const getEventCategory = (categoryKey: string) => {
    return (
      eventCategories[categoryKey as keyof typeof eventCategories] || {
        label: "Event",
        color: "text-gray-700",
        bgColor: "bg-transparent",
        icon: "📅",
        badgeClass: "border border-gray-200 bg-gray-100 text-gray-800",
        accentDot: "bg-gray-400",
        listStrip: "border-l-gray-400",
      }
    )
  }

  const isPastEvent = (eventDate: Date) => {
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)
    return eventDateOnly < today
  }

  const eventsInDisplayedMonth = events.filter((e) => {
    const d = e.date
    return d.getFullYear() === year && d.getMonth() === month
  }).length

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm">
      <CardContent className="p-0">
        {eventsInDisplayedMonth === 0 && (
          <div className="border-b border-slate-200/90 bg-gradient-to-r from-nc-red-50/90 via-white to-nc-navy/[0.04] px-4 py-4 sm:px-6">
            <p className="text-center text-sm font-medium text-nc-navy-900">
              No events scheduled this month with your current filters.
            </p>
            <p className="mt-1 text-center text-xs text-slate-600">
              Try another month, or turn event types back on in the sidebar.
            </p>
          </div>
        )}
        <div className="grid grid-cols-7 gap-0">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="border-b border-slate-200 bg-slate-50/90 p-2 text-center text-xs font-semibold text-nc-navy-900 sm:p-3 sm:text-sm"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            const dayEvents = getEventsForDay(date)
            const isTodayDate = isToday(date)
            const isCurrentMonthDate = isCurrentMonth(date)
            const isPastDay = isPastDate(date)

            return (
              <div
                key={index}
                className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r border-slate-200/90 ${
                  !isCurrentMonthDate ? "bg-slate-50/80" : isPastDay && !isTodayDate ? "bg-slate-50/50" : "bg-white"
                }`}
              >
                <div
                  className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold sm:mb-2 sm:h-6 sm:w-6 sm:text-sm ${
                    isTodayDate
                      ? "bg-nc-gold text-white shadow-sm ring-2 ring-nc-red/20"
                      : isCurrentMonthDate
                        ? isPastDay
                          ? "text-slate-400"
                          : "text-nc-navy-900"
                        : "text-slate-400"
                  }`}
                >
                  {date.getDate()}
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  {dayEvents.slice(0, 2).map((event, eventIndex) => {
                    const category = getEventCategory(event.category)
                    const multiDayIndicator = getMultiDayIndicator(event, date)
                    const isEventPast = isPastEvent(event.date)

                    return (
                      <div
                        key={eventIndex}
                        onClick={() => onEventClick(event)}
                        className={`group text-xs cursor-pointer rounded-md border border-transparent p-0.5 transition-colors hover:border-slate-200 hover:bg-slate-50 sm:p-1 ${
                          isEventPast ? "opacity-60" : ""
                        }`}
                        title={event.title + multiDayIndicator}
                      >
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${category.accentDot}`}
                            aria-hidden
                          />
                          <span className="flex-shrink-0 text-xs">{category.icon}</span>
                          <span className={`break-words leading-tight font-medium whitespace-normal ${
                            isEventPast ? 'text-gray-500' : 'text-gray-800'
                          }`}>
                            <span className="break-words leading-tight font-medium whitespace-normal block">
                              {event.title}
                              <span className="hidden sm:inline">{multiDayIndicator}</span>
                            </span>
                          </span>
                        </div>
                        {event.startTime && (
                          <div className={`text-xs ml-3 sm:ml-4 hidden sm:block ${
                            isEventPast ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {formatTime(event.startTime)}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {dayEvents.length > 2 && (
                    <div className={`text-xs font-medium ${
                      dayEvents.some(event => isPastEvent(event.date)) ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
