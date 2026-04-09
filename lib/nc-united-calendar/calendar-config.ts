import type { EventCategory, EventCategoryConfig, CalendarEvent } from "@/lib/nc-united-calendar/types"

export const eventCategories: Record<EventCategory, EventCategoryConfig> = {
  "blue-practice": {
    label: "Blue Team Practice",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🔵",
  },
  "gold-practice": {
    label: "Gold Team Practice",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🟡",
  },
  "training-camp": {
    label: "Training Camp",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🚌",
  },
  "ncu-dual-tournament": {
    label: "NCU Dual Tournament",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🏆",
  },
  "national-tournament": {
    label: "National Tournament",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🇺🇸",
  },
  podcast: {
    label: "Podcast",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🎙️",
  },
  "important-date": {
    label: "Important Date",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "📢",
  },
  "college-open": {
    label: "College Open",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "🏛️",
  },
  "ncaa-recruiting": {
    label: "NCAA Recruiting",
    color: "text-gray-700",
    bgColor: "bg-transparent",
    icon: "📋",
  },
}

export const EVENT_CATEGORIES = eventCategories

export const sampleEvents: CalendarEvent[] = []
