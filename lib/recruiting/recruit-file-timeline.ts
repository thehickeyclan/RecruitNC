/**
 * The recruiting file's activity list (app/my-recruits/[athleteId]): everything between this
 * program and this wrestler, one list, newest first. Pure, so the order and grouping are tested
 * without a database (lib/recruiting/recruit-file.ts reads the rows).
 *
 * The file is the program and the wrestler, not the wrestler (Matt, 2 Nov 2026): results come
 * in as one line each, never a table; the profile has those.
 */

export type FileEventKind = "upcoming" | "result" | "view" | "message_out" | "message_in" | "interest" | "logged" | "added"

export type FileEvent = {
  kind: FileEventKind
  /** ISO timestamp or YYYY-MM-DD; what the list sorts on. */
  at: string
  title: string
  detail?: string | null
  /** A staff member's name, or "You". */
  by?: string | null
  href?: string | null
  /** A result loaded in the last week. */
  fresh?: boolean
}

export type TimelineInput = {
  views: Array<{ at: string; by: string }>
  messages: Array<{ at: string; fromCoach: boolean; by: string; preview: string; threadId: string }>
  interest: { at: string; program: string } | null
  logged: Array<{ at: string; type: string; by: string; note: string | null; followUp: string | null }>
  results: Array<{ at: string; event: string; place: number | null; record: string | null; weight: string | null; addedAt: string | null }>
  upcoming: Array<{ startDate: string; endDate: string | null; title: string; location: string | null }>
  added: Array<{ at: string; by: string }>
}

/** The board's contact types (components/my-recruits-board.tsx ACTIVITY_TYPES). */
const LOGGED_LABEL: Record<string, string> = {
  call: "Call",
  text: "Text",
  email: "Email",
  visit: "Campus visit",
  watched_live: "Watched live",
  prospect_camp: "Prospect camp",
  social_media: "Social media",
  letter: "Letter",
  other: "Contact",
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`

const day = (iso: string) => iso.slice(0, 10)

/** Same coach, same day: one line with a count. A coach who opens the profile five times a day is one visit. */
export function groupViews(views: TimelineInput["views"]): FileEvent[] {
  const byKey = new Map<string, { at: string; by: string; n: number }>()
  for (const v of views) {
    const key = `${v.by}|${day(v.at)}`
    const cur = byKey.get(key)
    if (!cur) byKey.set(key, { at: v.at, by: v.by, n: 1 })
    else {
      cur.n++
      if (v.at > cur.at) cur.at = v.at
    }
  }
  return [...byKey.values()].map((g) => ({
    kind: "view" as const,
    at: g.at,
    title: g.n > 1 ? `Viewed profile ×${g.n}` : "Viewed profile",
    by: g.by,
  }))
}

export function buildTimeline(input: TimelineInput, now: Date = new Date(), max = 60): FileEvent[] {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const events: FileEvent[] = [
    ...input.upcoming.map((e) => ({
      kind: "upcoming" as const,
      at: e.startDate,
      title: e.title,
      detail: [e.endDate && e.endDate !== e.startDate ? `through ${e.endDate}` : null, e.location].filter(Boolean).join(" · ") || null,
    })),
    ...input.results.map((r) => ({
      kind: "result" as const,
      at: r.at,
      title: r.event,
      detail: [r.place && r.place > 0 ? ordinal(r.place) : null, r.record, r.weight ? `${r.weight} lbs` : null].filter(Boolean).join(" · ") || null,
      fresh: Boolean(r.addedAt && r.addedAt >= weekAgo),
    })),
    ...groupViews(input.views),
    ...input.messages.map((m) => ({
      kind: m.fromCoach ? ("message_out" as const) : ("message_in" as const),
      at: m.at,
      title: m.fromCoach ? "Message sent" : "Family replied",
      detail: m.preview || null,
      by: m.fromCoach ? m.by : null,
      href: `/inbox/${m.threadId}`,
    })),
    ...(input.interest
      ? [{ kind: "interest" as const, at: input.interest.at, title: `Family told ${input.interest.program}: interested` }]
      : []),
    ...input.logged.map((l) => ({
      kind: "logged" as const,
      at: l.at,
      title: LOGGED_LABEL[l.type] ?? LOGGED_LABEL.other!,
      detail: l.note?.trim() || null,
      by: l.by,
    })),
    ...input.added.map((a) => ({ kind: "added" as const, at: a.at, title: "Added to your recruits", by: a.by })),
  ]
  return events
    .filter((e) => e.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, max)
}

/**
 * The next step on the file: the newest logged contact that set a follow-up date. Older
 * follow-ups were replaced by it; a contact logged without one does not clear it.
 */
export function nextStepFrom(logged: TimelineInput["logged"]): { date: string; note: string | null; by: string } | null {
  const withFollowUp = logged.filter((l) => l.followUp).sort((a, b) => b.at.localeCompare(a.at))[0]
  return withFollowUp ? { date: day(withFollowUp.followUp!), note: withFollowUp.note?.trim() || null, by: withFollowUp.by } : null
}
