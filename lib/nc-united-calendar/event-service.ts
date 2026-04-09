import { supabase } from "@/lib/supabase"
import type { CalendarEvent, EventCategory } from "@/lib/nc-united-calendar/types"

export interface DatabaseEvent {
  id: string | number
  title: string
  start_date: string
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  category: EventCategory
  location?: string | null
  description?: string | null
  coach?: string | null
  registration_deadline?: string | null
  entry_fee?: number | null
  travel_info?: string | null
  weight_classes?: string[] | null
  rsvp_required?: boolean | null
  external_link?: string | null
  logo_url?: string | null
  drop_in_registration_link?: string | null
  max_drop_ins?: number | null
}

function createDateFromString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDateForDatabase(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function transformDatabaseEvent(dbEvent: DatabaseEvent): CalendarEvent {
  return {
    id: String(dbEvent.id),
    title: dbEvent.title,
    date: createDateFromString(dbEvent.start_date),
    endDate: dbEvent.end_date ? createDateFromString(dbEvent.end_date) : undefined,
    startTime: dbEvent.start_time ?? undefined,
    endTime: dbEvent.end_time ?? undefined,
    category: dbEvent.category,
    location: dbEvent.location ?? undefined,
    description: dbEvent.description ?? undefined,
    coach: dbEvent.coach ?? undefined,
    registrationDeadline: dbEvent.registration_deadline
      ? createDateFromString(dbEvent.registration_deadline)
      : undefined,
    entryFee: dbEvent.entry_fee ?? undefined,
    travelInfo: dbEvent.travel_info ?? undefined,
    weightClasses: dbEvent.weight_classes ?? undefined,
    rsvpRequired: dbEvent.rsvp_required ?? false,
    externalLink: dbEvent.external_link ?? undefined,
    dropInRegistrationLink: dbEvent.drop_in_registration_link ?? undefined,
    logoUrl: dbEvent.logo_url ?? undefined,
    maxDropIns: dbEvent.max_drop_ins ?? null,
  }
}

function transformEventForDatabase(event: Partial<CalendarEvent>): Partial<DatabaseEvent> {
  const dbEvent: Partial<DatabaseEvent> = {
    title: event.title,
    start_date: event.date ? formatDateForDatabase(event.date) : undefined,
    end_date: event.endDate ? formatDateForDatabase(event.endDate) : undefined,
    category: event.category,
    location: event.location,
    description: event.description,
    coach: event.coach,
    registration_deadline: event.registrationDeadline ? formatDateForDatabase(event.registrationDeadline) : undefined,
    entry_fee: event.entryFee,
    travel_info: event.travelInfo,
    weight_classes: event.weightClasses,
    rsvp_required: event.rsvpRequired,
    external_link: event.externalLink,
    logo_url: event.logoUrl,
  }

  if (event.dropInRegistrationLink !== undefined) {
    dbEvent.drop_in_registration_link = event.dropInRegistrationLink || null
  }

  if (event.maxDropIns !== undefined) {
    dbEvent.max_drop_ins = event.maxDropIns ?? null
  }

  if (event.startTime && event.startTime.trim() !== "") {
    dbEvent.start_time = event.startTime
  }

  if (event.endTime && event.endTime.trim() !== "") {
    dbEvent.end_time = event.endTime
  }

  return dbEvent
}

export const ncUnitedEventService = {
  async getEvents(): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: true })

      if (error) {
        console.error("[nc-united calendar] getEvents:", error.message)
        return []
      }

      return (data || []).map((row) => transformDatabaseEvent(row as DatabaseEvent))
    } catch (e) {
      console.error("[nc-united calendar] getEvents:", e)
      return []
    }
  },

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      const dbEvent = transformEventForDatabase(event)
      const { data, error } = await supabase.from("events").insert([dbEvent]).select().single()

      if (error) {
        console.error("[nc-united calendar] createEvent:", error.message)
        throw error
      }

      return transformDatabaseEvent(data as DatabaseEvent)
    } catch (e) {
      console.error("[nc-united calendar] createEvent:", e)
      throw e
    }
  },

  async updateEvent(id: string, event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      const dbEvent = transformEventForDatabase(event)
      const { data, error } = await supabase.from("events").update(dbEvent).eq("id", id).select().single()

      if (error) {
        console.error("[nc-united calendar] updateEvent:", error.message)
        throw error
      }

      return transformDatabaseEvent(data as DatabaseEvent)
    } catch (e) {
      console.error("[nc-united calendar] updateEvent:", e)
      throw e
    }
  },

  async deleteEvent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("events").delete().eq("id", id)

      if (error) {
        console.error("[nc-united calendar] deleteEvent:", error.message)
        throw error
      }

      return true
    } catch (e) {
      console.error("[nc-united calendar] deleteEvent:", e)
      throw e
    }
  },
}
