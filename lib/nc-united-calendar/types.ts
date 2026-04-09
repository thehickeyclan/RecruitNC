export interface EventCategoryConfig {
  label: string
  color: string
  bgColor: string
  icon: string
}

export type EventCategory =
  | "blue-practice"
  | "gold-practice"
  | "training-camp"
  | "ncu-dual-tournament"
  | "national-tournament"
  | "podcast"
  | "important-date"
  | "college-open"
  | "ncaa-recruiting"

export interface CalendarEvent {
  id: string
  title: string
  date: Date
  endDate?: Date
  startTime?: string
  endTime?: string
  category: EventCategory
  location?: string
  description?: string
  coach?: string
  entryFee?: number
  registrationDeadline?: Date
  weightClasses?: string[]
  rsvpRequired?: boolean
  logoUrl?: string
  dropInRegistrationLink?: string
  achievements?: string[]
  maxDropIns?: number | null
  externalLink?: string
  travelInfo?: string
}

export interface CalendarViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}
