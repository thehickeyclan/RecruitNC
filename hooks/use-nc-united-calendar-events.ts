"use client"

import { useState, useEffect, useCallback } from "react"
import { ncUnitedEventService } from "@/lib/nc-united-calendar/event-service"
import type { CalendarEvent } from "@/lib/nc-united-calendar/types"

export function useNcUnitedCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedEvents = await ncUnitedEventService.getEvents()
      setEvents(fetchedEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events")
    } finally {
      setLoading(false)
    }
  }, [])

  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    const newEvent = await ncUnitedEventService.createEvent(eventData)
    if (newEvent) {
      setEvents((prev) => [...prev, newEvent])
    }
    return newEvent
  }, [])

  const updateEvent = useCallback(async (id: string, eventData: Partial<CalendarEvent>) => {
    const updatedEvent = await ncUnitedEventService.updateEvent(id, eventData)
    if (updatedEvent) {
      setEvents((prev) => prev.map((event) => (event.id === id ? updatedEvent : event)))
    }
    return updatedEvent
  }, [])

  const deleteEvent = useCallback(async (id: string) => {
    const success = await ncUnitedEventService.deleteEvent(id)
    if (success) {
      setEvents((prev) => prev.filter((event) => event.id !== id))
    }
    return success
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}
