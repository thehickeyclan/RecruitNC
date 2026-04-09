"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { CalendarEvent } from "@/lib/nc-united-calendar/types"
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
      const eventStartDate = new Date(event.date)
      const eventEndDate = event.endDate ? new Date(event.endDate) : eventStartDate

      // Check if the current date falls within the event's date range
      const currentDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const startDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate())
      const endDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate())

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
    const startDate = new Date(event.date)
    const endDate = new Date(event.endDate)
    return startDate.toDateString() !== endDate.toDateString()
  }

  const getMultiDayIndicator = (event: CalendarEvent, currentDate: Date) => {
    if (!isMultiDayEvent(event)) return ""

    const eventStartDate = new Date(event.date)
    const eventEndDate = new Date(event.endDate!)
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    const startDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate())
    const endDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate())

    if (currentDateOnly.getTime() === startDateOnly.getTime()) return " (Day 1)"
    if (currentDateOnly.getTime() === endDateOnly.getTime()) return " (Final)"
    return " (Cont.)"
  }

  const getEventCategory = (categoryKey: string) => {
    return (
      eventCategories[categoryKey] || {
        label: "Event",
        color: "text-gray-700",
        bgColor: "bg-transparent",
        icon: "📅",
      }
    )
  }

  const isPastEvent = (eventDate: Date) => {
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)
    return eventDateOnly < today
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 gap-0">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 sm:p-3 text-center font-semibold text-gray-600 border-b border-gray-200 text-xs sm:text-sm"
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
                className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r border-gray-200 ${
                  !isCurrentMonthDate ? "bg-gray-50" : isPastDay && !isTodayDate ? "bg-gray-50" : "bg-white"
                }`}
              >
                <div
                  className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                    isTodayDate 
                      ? "bg-[#C6B069] text-white" 
                      : isCurrentMonthDate 
                        ? isPastDay 
                          ? "text-gray-400" 
                          : "text-gray-900" 
                        : "text-gray-400"
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
                        className={`text-xs cursor-pointer hover:bg-gray-100 transition-colors p-0.5 sm:p-1 rounded ${
                          isEventPast ? 'opacity-60' : ''
                        }`}
                        title={event.title + multiDayIndicator}
                      >
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <span className="text-xs flex-shrink-0">{category.icon}</span>
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
