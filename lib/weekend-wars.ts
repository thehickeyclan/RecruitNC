export const WEEKEND_WARS_EVENT_SLUG = "weekend-wars-super32-prep-2026-08-29-30" as const

export const WEEKEND_WARS_EVENT = {
  title: "Weekend Wars & Super 32 Prep Series",
  venue: "Darkhorse Wrestling",
  address: "2941 Interstate St., Charlotte, NC 28208",
  saturday: {
    date: "Saturday, August 29",
    detail: "Weekend Wars · Youth & middle school 9:00–11:00 AM · High school 12:00–2:00 PM",
  },
  sunday: {
    date: "Sunday, August 30",
    detail: "Super 32 Prep Series · Session 1 9:00–11:00 AM · Session 2 12:00–2:00 PM",
  },
} as const

export type WeekendWarsAthleteSearchResult = {
  id: string
  name: string
  highSchool: string | null
  weightClass: string | null
  wrestlingClub: string | null
}
