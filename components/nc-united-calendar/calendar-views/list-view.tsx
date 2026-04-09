"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, MapPin, User, ExternalLink, Users } from 'lucide-react'
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"
import { formatTime } from "@/lib/nc-united-calendar/time-utils"
import type { CalendarViewProps, EventCategory } from "@/lib/nc-united-calendar/types"

export function ListView({
  events,
  onEventClick,
  visibleCategories,
  currentDate,
}: CalendarViewProps & { currentDate: Date; visibleCategories?: Set<EventCategory> }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time for accurate date comparison

  const filteredEvents = events.filter((event) => {
    // Filter by visible categories
    const categoryMatch = !visibleCategories || visibleCategories.has(event.category)

    // Filter by current month and year
    const eventDate = event.date
    const monthMatch =
      eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear()

    return categoryMatch && monthMatch
  })

  const sortedEvents = filteredEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  if (sortedEvents.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No events found for the selected filters.</div>
  }

  const isPastEvent = (eventDate: Date) => {
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)
    return eventDateOnly < today
  }

  return (
    <div className="space-y-4">
      {sortedEvents.map((event) => {
        const categoryConfig = eventCategories[event.category]
        const showDropInLink =
          (event.category === "blue-practice" || event.category === "gold-practice") && event.dropInRegistrationLink
        const isEventPast = isPastEvent(event.date)

        return (
          <Card key={event.id} className={`hover:shadow-md transition-shadow ${isEventPast ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{categoryConfig.icon}</span>
                    <h3 className={`font-semibold text-lg break-words whitespace-normal ${isEventPast ? 'text-gray-500' : ''}`}>
                      {event.title}
                    </h3>
                    <span className={`text-sm ${isEventPast ? 'text-gray-400' : 'text-gray-600'}`}>
                      {categoryConfig.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {event.date.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {event.endDate && event.endDate.getTime() !== event.date.getTime() && (
                          <span>
                            {" "}
                            -{" "}
                            {event.endDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </span>
                    </div>

                    {(event.startTime || event.endTime) && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {event.startTime && formatTime(event.startTime)}
                          {event.startTime && event.endTime && " - "}
                          {event.endTime && formatTime(event.endTime)}
                        </span>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}

                    {event.coach && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{event.coach}</span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  {event.externalLink && (
                    <Button asChild variant="outline" size="sm" disabled={isEventPast}>
                      <a href={event.externalLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Link
                      </a>
                    </Button>
                  )}

                  {showDropInLink && !isEventPast && (
                    <Button asChild size="sm" className="bg-nc-navy-950 hover:bg-nc-navy-800">
                      <a href={event.dropInRegistrationLink} target="_blank" rel="noopener noreferrer">
                        <Users className="h-4 w-4 mr-1" />
                        Drop-in
                      </a>
                    </Button>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => onEventClick?.(event)}>
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
