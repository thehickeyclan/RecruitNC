/**
 * "What changed for you": the top of the Command Center home (Matt, 2 Nov 2026, from the outside
 * review he adopted - make the Command Center automatic instead of homework). A family opens it and
 * reads, without filling anything in: who looked at their wrestler, which colleges on their list
 * may need his weight, who is still waiting to hear from them, and the next two things to do.
 *
 * Everything here is worked out in code from records we already hold, never by a model:
 * - views are the Activity page's (lib/coach-profile-views.ts), placed on the college map by name;
 * - a possible need is inferred from the college's own roster (lib/college-programs/roster-room.ts)
 *   at the weight the wrestler last competed at, never the profile's listed weight, and always
 *   labelled as inferred. It is a direction, never an opening or a scholarship;
 * - a coach-confirmed need (a coach posting the weights and class years they recruit) comes first
 *   and is labelled as such, once that table exists;
 * - the next two actions are picked by the fixed order in nextTwoActions().
 */

export type Level = string

/** One college program's profile view. `schoolId` is null when the map has no such school. */
export type FeedView = { school: string; schoolId: string | null; level: Level | null; at: string }

export type FeedListSchool = { id: string; name: string; level: Level; status: string; contacted: boolean; savedAt: string | null }

/** A possible need at the wrestler's weight on a college on the list. */
export type FeedNeed = {
  schoolId: string
  name: string
  level: Level
  weight: number
  source: "coach" | "inferred"
  /** The fact behind it, e.g. "2 of 3 at 149 finish by 2028". */
  line: string
}

export type FeedThread = { id: string; program: string | null; unread: boolean; yourTurn: boolean; at: string }
export type FeedVisit = { id: string; schoolId: string; schoolName: string; startsOn: string; kind: "official" | "unofficial"; needsConfirm: boolean }
export type FeedReminder = { id: string; note: string; remindAt: string }

export type FeedInput = {
  firstName: string
  /** Now, as an ISO timestamp. */
  now: string
  /** Last competed weight, or null when no result records one. */
  weight: number | null
  views: FeedView[]
  list: FeedListSchool[]
  needs: FeedNeed[]
  threads: FeedThread[]
  visits: FeedVisit[]
  reminders: FeedReminder[]
  /** The list size this grade should build toward (lib/college-programs/roadmap.ts listTarget). */
  listTarget: number
  /** Events on the schedule from today on. */
  upcomingEvents: number
}

export type ViewedProgram = { school: string; schoolId: string | null; level: Level | null; onList: boolean; views: number; lastAt: string }

export type FeedAction = { key: string; label: string; why: string; href: string }

export type Feed = {
  /** "week" when a program looked in the last 7 days, else "month" (30 days). */
  window: "week" | "month"
  viewed: ViewedProgram[]
  needs: FeedNeed[]
  notContacted: FeedListSchool[]
  threads: FeedThread[]
  visits: FeedVisit[]
  reminders: FeedReminder[]
  actions: [FeedAction, FeedAction]
  /** Nothing saved, nothing viewed, nothing in the inbox: the starter shortlist instead. */
  empty: boolean
}

const DAY = 864e5

/** Programs that viewed in the window, one row each, most recent first. */
export function viewedPrograms(views: FeedView[], listIds: Set<string>, since: string): ViewedProgram[] {
  const by = new Map<string, ViewedProgram>()
  for (const v of views) {
    if (v.at < since) continue
    const key = v.schoolId ?? v.school.toLowerCase()
    const row = by.get(key)
    if (row) {
      row.views++
      if (v.at > row.lastAt) row.lastAt = v.at
    } else by.set(key, { school: v.school, schoolId: v.schoolId, level: v.level, onList: Boolean(v.schoolId && listIds.has(v.schoolId)), views: 1, lastAt: v.at })
  }
  return [...by.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/** Coach-confirmed needs first, then inferred; one row per school (its coach-confirmed one wins). */
export function orderNeeds(needs: FeedNeed[]): FeedNeed[] {
  const out = new Map<string, FeedNeed>()
  for (const n of [...needs].sort((a, b) => (a.source === b.source ? 0 : a.source === "coach" ? -1 : 1))) if (!out.has(n.schoolId)) out.set(n.schoolId, n)
  return [...out.values()]
}

const composer = (schoolId: string) => `/my-recruiting/colleges?email=${encodeURIComponent(schoolId)}`

/**
 * Exactly two next actions, in a fixed order: a coach waiting on a reply; a list school that
 * looked and has not been written to; a list school that may need his weight and has not been
 * written to; a visit to confirm; a program that looked and is not on the list; the oldest list
 * school not yet written to; building the list; the next event; and the map, which always fits.
 * Never two for the same school.
 */
export function nextTwoActions(input: FeedInput, f: Omit<Feed, "actions" | "empty">): [FeedAction, FeedAction] {
  const name = input.firstName
  const picks: FeedAction[] = []
  const usedSchools = new Set<string>()
  const add = (a: FeedAction, schoolId?: string | null) => {
    if (picks.length >= 2 || picks.some((p) => p.key === a.key)) return
    if (schoolId && usedSchools.has(schoolId)) return
    if (schoolId) usedSchools.add(schoolId)
    picks.push(a)
  }

  const waiting = input.threads.find((t) => t.unread || t.yourTurn)
  if (waiting) add({ key: `reply:${waiting.id}`, label: `Reply to ${waiting.program ?? "the coach"}`, why: "A coach wrote to you. A reply within a day or two keeps the conversation going.", href: `/inbox/${waiting.id}` })

  const notContacted = new Map(input.list.filter((s) => !s.contacted).map((s) => [s.id, s]))
  for (const v of f.viewed) {
    const s = v.schoolId ? notContacted.get(v.schoolId) : null
    if (s) add({ key: `email:${s.id}`, label: `Email ${s.name}`, why: `${s.name} viewed ${name}'s profile and is on your list. You have not written to them yet.`, href: composer(s.id) }, s.id)
  }
  for (const n of f.needs) {
    const s = notContacted.get(n.schoolId)
    if (s) add({ key: `email:${s.id}`, label: `Email ${s.name}`, why: `${n.source === "coach" ? "Their coach posted a need" : "Their roster suggests room"} at ${n.weight}. You have not written to them yet.`, href: composer(s.id) }, s.id)
  }
  const confirm = input.visits.find((v) => v.needsConfirm)
  if (confirm) add({ key: `visit:${confirm.id}`, label: `Did the ${confirm.schoolName} visit happen?`, why: "Mark it so the college moves along your list.", href: "/my-recruiting/plan#visits" }, confirm.schoolId)
  const offList = f.viewed.find((v) => v.schoolId && !v.onList)
  if (offList?.schoolId) add({ key: `save:${offList.schoolId}`, label: `Look at ${offList.school}`, why: `They viewed ${name}'s profile and are not on your list.`, href: `/recruiting/schools/${offList.schoolId}` }, offList.schoolId)
  const oldest = [...notContacted.values()].sort((a, b) => (a.savedAt ?? "").localeCompare(b.savedAt ?? "")).find((s) => !usedSchools.has(s.id))
  if (oldest) add({ key: `email:${oldest.id}`, label: `Email ${oldest.name}`, why: "On your list the longest without a message from you.", href: composer(oldest.id) }, oldest.id)
  if (input.list.length < input.listTarget)
    add({ key: "build", label: input.list.length ? `Save ${input.listTarget - input.list.length} more colleges` : "Save your first colleges", why: `Build toward ${input.listTarget}, across levels. A wide list gives ${name} options.`, href: "/recruiting/college-map" })
  if (input.upcomingEvents === 0) add({ key: "event", label: `Add where ${name} competes next`, why: `Coaches who follow ${name} see it and can come watch.`, href: "/my-recruiting/plan#schedule" })
  add({ key: "map", label: "Find more colleges on the map", why: "Filter by level, state and cost.", href: "/recruiting/college-map" })
  add({ key: "rules", label: "Check when coaches can contact you", why: `The rules for ${name}'s class, by level.`, href: "/my-recruiting/rules" })
  return [picks[0], picks[1]]
}

export function buildFeed(input: FeedInput): Feed {
  const now = Date.parse(input.now)
  const week = new Date(now - 7 * DAY).toISOString()
  const month = new Date(now - 30 * DAY).toISOString()
  const listIds = new Set(input.list.map((s) => s.id))
  const thisWeek = viewedPrograms(input.views, listIds, week)
  const window: Feed["window"] = thisWeek.length ? "week" : "month"
  const viewed = thisWeek.length ? thisWeek : viewedPrograms(input.views, listIds, month)
  const soon = new Date(now + 30 * DAY).toISOString().slice(0, 10)
  const base = {
    window,
    viewed,
    needs: input.weight ? orderNeeds(input.needs.filter((n) => listIds.has(n.schoolId))) : [],
    notContacted: input.list.filter((s) => !s.contacted),
    threads: input.threads.filter((t) => t.unread || t.yourTurn),
    visits: input.visits.filter((v) => v.needsConfirm || v.startsOn <= soon),
    reminders: input.reminders.filter((r) => r.remindAt >= input.now && r.remindAt <= new Date(now + 7 * DAY).toISOString()),
  }
  return { ...base, actions: nextTwoActions(input, base), empty: input.list.length === 0 && viewed.length === 0 && base.threads.length === 0 }
}

/** A brand-new family's first three moves: save from the starter shortlist, the schedule or the profile, and the rules. */
export function firstThreeActions(input: { firstName: string; athleteId: string; upcomingEvents: number; profilePercent: number }): FeedAction[] {
  const name = input.firstName
  return [
    { key: "starter", label: "Save colleges from the shortlist", why: `Picked for ${name}'s weight, class and state. One tap each.`, href: "#cc-starter" },
    input.upcomingEvents === 0
      ? { key: "event", label: `Add where ${name} competes next`, why: `Coaches who follow ${name} see it and can come watch.`, href: "/my-recruiting/plan#schedule" }
      : input.profilePercent < 100
        ? { key: "profile", label: `Finish ${name}'s profile`, why: `${input.profilePercent}% done. Coaches read it first.`, href: `/athletes/${input.athleteId}` }
        : { key: "map", label: "Find more colleges on the map", why: "Filter by level, state and cost.", href: "/recruiting/college-map" },
    { key: "rules", label: "Check when coaches can contact you", why: `The rules for ${name}'s class, by level.`, href: "/my-recruiting/rules" },
  ]
}
