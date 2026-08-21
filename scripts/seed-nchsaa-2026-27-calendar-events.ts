/**
 * Add the 2026–27 NCHSAA wrestling season dates to the public calendar.
 *
 * Dry run (default):
 *   npm run calendar:seed-nchsaa-2026-27
 *
 * Apply to the configured Supabase project:
 *   npm run calendar:seed-nchsaa-2026-27 -- --apply
 *
 * The script is safe to rerun. Within the 2026–27 wrestling season it matches events
 * by title and date, inserts missing rows, updates changed rows, and leaves exact
 * matches alone. Legacy titles from the original six-event seed are migrated.
 */

import { createAdminClient } from "../lib/supabase/admin"
import type { EventCategory } from "../lib/nc-united-calendar/types"

type CalendarSeedEvent = {
  title: string
  start_date: string
  end_date: string | null
  category: EventCategory
  description: string
  logo_url: string
  rsvp_required: boolean
  legacy_title?: string
}

type ExistingEvent = CalendarSeedEvent & {
  id: string | number
}

const APPLY = process.argv.includes("--apply")
const SEASON_START = "2026-11-01"
const SEASON_END = "2027-02-28"
const CATEGORY: EventCategory = "important-date"
const NCHSAA_LOGO = "/images/nchsaa-logo.png"

export const NCHSAA_2026_27_EVENTS: CalendarSeedEvent[] = [
  {
    title: "NCHSAA | First Practice Date",
    start_date: "2026-11-02",
    end_date: null,
    category: CATEGORY,
    description: "First practice date for the 2026–27 NCHSAA wrestling season.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
  },
  {
    title: "NCHSAA | First Contest Date",
    start_date: "2026-11-11",
    end_date: null,
    category: CATEGORY,
    description: "First contest date for the 2026–27 NCHSAA wrestling season.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
  },
  {
    title: "NCHSAA DUAL TEAM | Bracketing",
    start_date: "2027-01-28",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA dual team bracketing date.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
    legacy_title: "NCHSAA Dual Team Seeding",
  },
  {
    title: "NCHSAA DUAL TEAM | 1st & 2nd Rounds",
    start_date: "2027-01-30",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA dual team first and second rounds.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
    legacy_title: "NCHSAA Dual Team 1st/2nd Round",
  },
  {
    title: "NCHSAA DUAL TEAM | 3rd Rounds & Regionals",
    start_date: "2027-02-03",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA dual team third rounds and regionals.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
    legacy_title: "NCHSAA Dual Team 3rd Round/Regionals",
  },
  {
    title: "NCHSAA DUAL TEAM | State Championships",
    start_date: "2027-02-05",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA dual team state championships.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
    legacy_title: "NCHSAA Dual Team State Championships",
  },
  {
    title: "NCHSAA DUAL TEAM | State Championships",
    start_date: "2027-02-06",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA dual team state championships.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
  },
  {
    title: "NCHSAA INDIVIDUAL | Regionals",
    start_date: "2027-02-12",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA individual regionals.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
    legacy_title: "NCHSAA Boys and Girls Individual Regionals",
  },
  {
    title: "NCHSAA INDIVIDUAL | Regionals",
    start_date: "2027-02-13",
    end_date: null,
    category: CATEGORY,
    description: "NCHSAA individual regionals.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
  },
  {
    title: "NCHSAA INDIVIDUAL | Men and Women State Championships Start",
    start_date: "2027-02-18",
    end_date: null,
    category: CATEGORY,
    description: "Start of the NCHSAA men and women individual state championships.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
    legacy_title: "NCHSAA Boys and Girls Individual State Championships",
  },
  {
    title: "NCHSAA INDIVIDUAL | Men and Women State Championships End",
    start_date: "2027-02-20",
    end_date: null,
    category: CATEGORY,
    description: "End of the NCHSAA men and women individual state championships.",
    logo_url: NCHSAA_LOGO,
    rsvp_required: false,
  },
]

const COMPARABLE_FIELDS: Array<keyof CalendarSeedEvent> = [
  "title",
  "start_date",
  "end_date",
  "category",
  "description",
  "logo_url",
  "rsvp_required",
]

function databaseRow(event: CalendarSeedEvent): Omit<CalendarSeedEvent, "legacy_title"> {
  const { legacy_title: _legacyTitle, ...row } = event
  return row
}

function changedFields(existing: ExistingEvent, desired: CalendarSeedEvent): string[] {
  return COMPARABLE_FIELDS.filter((field) => existing[field] !== desired[field])
}

async function main() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("events")
    .select("id,title,start_date,end_date,category,description,logo_url,rsvp_required")
    .gte("start_date", SEASON_START)
    .lte("start_date", SEASON_END)

  if (error) throw new Error(`Unable to read 2026–27 calendar events: ${error.message}`)

  const existingRows = (data ?? []) as ExistingEvent[]
  const now = new Date().toISOString()
  let created = 0
  let updated = 0
  let unchanged = 0

  console.log(APPLY ? "APPLYING 2026–27 NCHSAA CALENDAR EVENTS" : "DRY RUN — 2026–27 NCHSAA CALENDAR EVENTS")
  console.log("")

  for (const desired of NCHSAA_2026_27_EVENTS) {
    const matches = existingRows.filter(
      (row) => row.title.trim() === desired.title && row.start_date === desired.start_date,
    )
    if (matches.length > 1) {
      throw new Error(
        `Found ${matches.length} existing events titled "${desired.title}" on ${desired.start_date}. Resolve duplicates before rerunning.`,
      )
    }

    const legacyMatches = desired.legacy_title
      ? existingRows.filter(
          (row) => row.title.trim() === desired.legacy_title && row.start_date === desired.start_date,
        )
      : []
    if (legacyMatches.length > 1) {
      throw new Error(
        `Found ${legacyMatches.length} legacy events titled "${desired.legacy_title}" on ${desired.start_date}. Resolve duplicates before rerunning.`,
      )
    }

    const existing = matches[0] ?? legacyMatches[0]
    const desiredRow = databaseRow(desired)
    if (!existing) {
      console.log(`${APPLY ? "CREATE" : "WOULD CREATE"}  ${desired.start_date}${desired.end_date ? `–${desired.end_date}` : ""}  ${desired.title}`)
      if (APPLY) {
        const { error: insertError } = await admin.from("events").insert({
          ...desiredRow,
          created_at: now,
          updated_at: now,
        })
        if (insertError) throw new Error(`Unable to create "${desired.title}": ${insertError.message}`)
      }
      created += 1
      continue
    }

    const changes = changedFields(existing, desiredRow)
    if (changes.length === 0) {
      console.log(`UNCHANGED  ${desired.start_date}${desired.end_date ? `–${desired.end_date}` : ""}  ${desired.title}`)
      unchanged += 1
      continue
    }

    console.log(`${APPLY ? "UPDATE" : "WOULD UPDATE"}  ${desired.title} (${changes.join(", ")})`)
    if (APPLY) {
      const { error: updateError } = await admin
        .from("events")
        .update({ ...desiredRow, updated_at: now })
        .eq("id", existing.id)
      if (updateError) throw new Error(`Unable to update "${desired.title}": ${updateError.message}`)
    }
    updated += 1
  }

  console.log("")
  console.log(
    `${APPLY ? "Applied" : "Planned"}: ${created} create, ${updated} update, ${unchanged} unchanged.`,
  )
  if (!APPLY) console.log("Re-run with --apply to write these events.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
