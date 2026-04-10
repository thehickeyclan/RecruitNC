import type { EventCategory, EventCategoryConfig, CalendarEvent } from "@/lib/nc-united-calendar/types"

/** Subtle surfaces using brand navy / red / gold — avoid generic Tailwind `red-*` for NC United UI. */
export const eventCategories: Record<EventCategory, EventCategoryConfig> = {
  "blue-practice": {
    label: "Blue Team Practice",
    color: "text-nc-navy-900",
    bgColor: "bg-nc-navy/5",
    icon: "🔵",
    badgeClass: "border border-nc-navy/25 bg-nc-navy/10 text-nc-navy-900",
    accentDot: "bg-nc-navy-600",
    listStrip: "border-l-nc-navy-600",
  },
  "gold-practice": {
    label: "Gold Team Practice",
    color: "text-amber-900",
    bgColor: "bg-nc-gold/10",
    icon: "🟡",
    badgeClass: "border border-[#C6B069]/40 bg-[#C6B069]/15 text-amber-950",
    accentDot: "bg-[#C6B069]",
  },
  "training-camp": {
    label: "Training Camp",
    color: "text-emerald-900",
    bgColor: "bg-emerald-50",
    icon: "🚌",
    badgeClass: "border border-emerald-200 bg-emerald-50 text-emerald-900",
    accentDot: "bg-emerald-600",
    listStrip: "border-l-emerald-600",
  },
  "ncu-dual-tournament": {
    label: "NCU Dual Tournament",
    color: "text-nc-red-800",
    bgColor: "bg-nc-red-50",
    icon: "🏆",
    badgeClass: "border border-nc-red-200 bg-nc-red-50 text-nc-red-800",
    accentDot: "bg-nc-red",
    listStrip: "border-l-nc-red",
  },
  "national-tournament": {
    label: "National Tournament",
    color: "text-nc-red-800",
    bgColor: "bg-nc-red-50",
    icon: "🇺🇸",
    badgeClass: "border border-nc-red-200 bg-nc-red-50 text-nc-red-800",
    accentDot: "bg-nc-red",
    listStrip: "border-l-nc-red",
  },
  podcast: {
    label: "Podcast",
    color: "text-violet-900",
    bgColor: "bg-violet-50",
    icon: "🎙️",
    badgeClass: "border border-violet-200 bg-violet-50 text-violet-900",
    accentDot: "bg-violet-600",
    listStrip: "border-l-violet-600",
  },
  "important-date": {
    label: "Important Date",
    color: "text-orange-900",
    bgColor: "bg-orange-50",
    icon: "📢",
    badgeClass: "border border-orange-200 bg-orange-50 text-orange-900",
    accentDot: "bg-orange-500",
    listStrip: "border-l-orange-500",
  },
  "college-open": {
    label: "College Open",
    color: "text-slate-800",
    bgColor: "bg-slate-100",
    icon: "🏛️",
    badgeClass: "border border-slate-200 bg-slate-100 text-slate-800",
    accentDot: "bg-slate-500",
    listStrip: "border-l-slate-500",
  },
  "ncaa-recruiting": {
    label: "NCAA Recruiting",
    color: "text-indigo-900",
    bgColor: "bg-indigo-50",
    icon: "📋",
    badgeClass: "border border-indigo-200 bg-indigo-50 text-indigo-900",
    accentDot: "bg-indigo-600",
    listStrip: "border-l-indigo-600",
  },
}

export const EVENT_CATEGORIES = eventCategories

export const sampleEvents: CalendarEvent[] = []
