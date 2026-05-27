/**
 * National team events: one place to add display names and URL → DB slug mapping.
 * Used by registration pages, success pages, and APIs (success/cancel URLs).
 * Add a new event: add an entry here and create invite codes in Admin → National team → Invite codes (select event).
 *
 * Roster decision: Which roster (e.g. National vs Select) is determined by the REG LINK (URL path),
 * not by the invite code. You can use the same invite code for both; the link they open decides the roster.
 */

export type NationalTeamEventConfig = {
  /** Display name for the event (e.g. "NHSCA Duals 2026") */
  name: string
  /** If set, this URL slug maps to a different event_slug in the DB (e.g. nhsca-2026 → nhsca-duals-2026) */
  eventSlug?: string
}

/** URL slug → display name and optional DB event_slug. Keys are what appears in /national-team/register/[eventSlug]. */
export const NATIONAL_TEAM_EVENTS: Record<string, NationalTeamEventConfig> = {
  "nhsca-2026": {
    name: "NHSCA Duals 2026",
    eventSlug: "nhsca-duals-2026",
  },
  "nhsca-duals-2026": {
    name: "NHSCA Duals 2026",
  },
  "nhsca-duals-2026-select": {
    name: "NHSCA Duals 2026 – Select",
  },
  "aau-2026": {
    name: "AAU Scholastic Duals 2026 – Boys All-Star",
  },
}

/** Normalize a stored slug (e.g. from DB) for lookup: trim, lowercase, underscores → hyphens. */
export function normalizeEventSlugForLookup(slug: string): string {
  return (slug ?? "").trim().toLowerCase().replace(/_/g, "-")
}

/** Resolve URL slug to the event_slug used in DB/API (invite codes, registrations). */
export function getEventSlugForApi(urlSlug: string): string {
  const normalized = normalizeEventSlugForLookup(urlSlug)
  const config = NATIONAL_TEAM_EVENTS[normalized]
  if (config?.eventSlug) return config.eventSlug
  return normalized || urlSlug
}

/** Get display name for an event (URL slug or API slug). */
export function getEventName(slug: string): string {
  const byUrl = NATIONAL_TEAM_EVENTS[slug]
  if (byUrl) return byUrl.name
  const byApi = Object.entries(NATIONAL_TEAM_EVENTS).find(
    ([_, c]) => c.eventSlug === slug || (!c.eventSlug && _ === slug)
  )
  if (byApi) return byApi[1].name
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Short roster label for success page (e.g. "National", "Select"). Based on URL slug they used to register. */
export function getRosterLabel(urlSlug: string): string {
  const apiSlug = getEventSlugForApi(urlSlug)
  for (const members of Object.values(HUB_EVENT_GROUPS)) {
    const found = members.find((m) => m.eventSlug === apiSlug)
    if (found) return found.label
  }
  return getEventName(urlSlug)
}

/** All event slugs that have a config (for validation/404). */
export function getKnownEventUrlSlugs(): string[] {
  return Object.keys(NATIONAL_TEAM_EVENTS)
}

/** API (DB) event slugs that are valid for invite codes / registrations. */
export function getEventSlugsForAdmin(): string[] {
  const slugs = new Set<string>()
  for (const [urlSlug, config] of Object.entries(NATIONAL_TEAM_EVENTS)) {
    slugs.add(config.eventSlug ?? urlSlug)
  }
  return Array.from(slugs).sort()
}

/** Preferred URL slug to use in registration links for a given API slug (e.g. nhsca-duals-2026 → nhsca-2026). */
export function getUrlSlugForRegistration(apiSlug: string): string {
  const entry = Object.entries(NATIONAL_TEAM_EVENTS).find(
    ([url, c]) => (c.eventSlug ?? url) === apiSlug
  )
  return entry ? entry[0] : apiSlug
}

/** If groupName matches a known event display name (e.g. "NHSCA Duals 2026"), return that event's API slug for hub link. */
export function getEventSlugFromGroupName(groupName: string): string | null {
  const name = (groupName ?? "").trim()
  if (!name) return null
  const nameLower = name.toLowerCase()
  for (const [, config] of Object.entries(NATIONAL_TEAM_EVENTS)) {
    const eventName = config.name
    if (eventName.toLowerCase() === nameLower || nameLower.includes(eventName.toLowerCase())) {
      return config.eventSlug ?? eventName.replace(/\s+/g, "-").toLowerCase()
    }
  }
  return null
}

/** Team Hubs menu for navbar: which hubs are live vs coming soon. Hub not linked from app — access via shared link only. */
export const TEAM_HUB_MENU: { slug: string; label: string; href?: string }[] = [
  { slug: "nhsca-duals-2026", label: "NHSCA Duals 2026" },
  { slug: "aau-2026", label: "AAU Scholastic Duals 2026" },
]

/** Hub display grouping: one hub section per key, with multiple event slugs and labels (e.g. Main / Select). */
export const HUB_EVENT_GROUPS: Record<string, { eventSlug: string; label: string }[]> = {
  "nhsca-duals-2026": [
    { eventSlug: "nhsca-duals-2026", label: "National" },
    { eventSlug: "nhsca-duals-2026-select", label: "Select" },
  ],
}

export type HubGroupInfo = {
  groupKey: string
  groupName: string
  members: { eventSlug: string; label: string }[]
}

/** If this event slug is part of a hub group, return the group info; otherwise null. */
export function getHubGroupForEvent(eventSlug: string): HubGroupInfo | null {
  for (const [groupKey, members] of Object.entries(HUB_EVENT_GROUPS)) {
    if (members.some((m) => m.eventSlug === eventSlug)) {
      const groupName = getEventName(members[0].eventSlug)
      return { groupKey, groupName, members }
    }
  }
  return null
}
