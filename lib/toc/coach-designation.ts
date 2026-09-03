/**
 * Corner coach designations — the rules, kept out of the route so they can be tested.
 *
 * A designation is one athlete naming one coach. The same coach named by twelve families is
 * twelve rows and one lanyard, and both readings matter: the check-in desk needs the coach, the
 * mat needs the athlete.
 */

/** Two per athlete. A cap on who is credentialed, not on who may stand up during a match. */
export const MAX_COACHES_PER_ATHLETE = 2

export type CoachDesignationInput = {
  coachName?: unknown
  coachEmail?: unknown
  coachPhone?: unknown
  relationship?: unknown
}

export type CoachDesignation = {
  coachName: string
  coachEmail: string | null
  coachPhone: string | null
  relationship: string | null
  /** Email where we have one, otherwise the digits of the phone. See {@link coachKeyFor}. */
  coachKey: string
  phoneKey: string | null
}

/** Digits only, so "(919) 555-0100" and "919-555-0100" are one number. */
export function phoneKeyFor(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  // Ten digits, or eleven starting with a US country code.
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return null
}

/**
 * The dedupe key: what collapses one coach named by twelve families into one lanyard.
 *
 * Email when we have it, the phone otherwise. Families may give either, which means a coach given
 * by email on one form and by phone on another arrives as two people — the admin review flags
 * same-name coaches so that can be merged by hand. Better than refusing a designation from a
 * parent who only has their coach's number.
 */
export function coachKeyFor(email: string | null, phone: string | null): string | null {
  const cleanEmail = (email ?? "").trim().toLowerCase()
  if (cleanEmail) return cleanEmail
  const digits = phoneKeyFor(phone ?? "")
  return digits ? `tel:${digits}` : null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateCoachDesignation(
  input: CoachDesignationInput,
): { ok: true; value: CoachDesignation } | { ok: false; error: string } {
  const coachName = String(input.coachName ?? "").trim()
  const rawEmail = String(input.coachEmail ?? "").trim()
  const rawPhone = String(input.coachPhone ?? "").trim()

  if (coachName.length < 2) return { ok: false, error: "Enter the coach's full name." }
  if (rawEmail && !EMAIL.test(rawEmail)) return { ok: false, error: "That coach email does not look right." }
  if (rawPhone && !phoneKeyFor(rawPhone)) return { ok: false, error: "That coach phone number does not look right." }

  // One way to reach them is the minimum: without it they cannot be told they are credentialed,
  // and there is nothing to dedupe them by.
  if (!rawEmail && !rawPhone) {
    return { ok: false, error: "Give the coach's email or mobile number so we can reach them." }
  }

  const coachKey = coachKeyFor(rawEmail || null, rawPhone || null)
  if (!coachKey) return { ok: false, error: "Give the coach's email or mobile number so we can reach them." }

  const relationship = String(input.relationship ?? "").trim()
  return {
    ok: true,
    value: {
      coachName,
      coachEmail: rawEmail || null,
      coachPhone: rawPhone || null,
      relationship: relationship || null,
      coachKey,
      phoneKey: phoneKeyFor(rawPhone),
    },
  }
}

/**
 * Whether this submission fits alongside what the athlete already has.
 *
 * Re-naming a coach already on file is an edit, not a third coach — otherwise a family fixing a
 * typo in a phone number would be told they are over the limit.
 */
export function fitsWithinCap(
  existingKeys: string[],
  incoming: CoachDesignation[],
): { ok: true } | { ok: false; error: string } {
  const keys = new Set(existingKeys)
  for (const coach of incoming) keys.add(coach.coachKey)
  if (keys.size > MAX_COACHES_PER_ATHLETE) {
    return {
      ok: false,
      error: `Each wrestler may designate up to ${MAX_COACHES_PER_ATHLETE} corner coaches. Contact us to change who is already on file.`,
    }
  }
  return { ok: true }
}

/** Two coaches with the same email are one coach, whatever the form says. */
export function dedupeIncoming(coaches: CoachDesignation[]): CoachDesignation[] {
  const seen = new Map<string, CoachDesignation>()
  for (const coach of coaches) if (!seen.has(coach.coachKey)) seen.set(coach.coachKey, coach)
  return [...seen.values()]
}

export type CheckInCoach = {
  coachKey: string
  coachName: string
  coachEmail: string | null
  coachPhone: string | null
  status: string
  /** When they were told they are credentialed, and by which means. */
  notifiedAt: string | null
  notifiedChannel: string | null
  athletes: {
    athleteName: string
    weightClass: number | null
    /**
     * This wrestler's own designation status.
     *
     * The coach-level `status` above is the strongest across all their wrestlers, because the
     * lanyard is per person. Whether a coach may corner a *particular* wrestler is per row, and
     * collapsing the two hid it: one coach read APPROVED on the card while two of his three
     * wrestlers were still pending, with no button offered to approve them.
     */
    status: string
    /** Supplied by the family because we had none on file. Wants applying to the athlete. */
    submittedClub: string | null
    submittedDob: string | null
  }[]
  /** True when any wrestler is still waiting, whatever the coach-level status says. */
  hasPendingAthlete: boolean
}

/**
 * The check-in list: one row per coach, with everyone they corner.
 *
 * Rows arrive one per athlete-coach pair. The desk hands out one lanyard per person, so this is
 * the shape that governs the door — and the athlete list is what settles an argument about
 * whether somebody belongs on the floor.
 */
export function toCheckInList(
  rows: {
    coach_key: string
    coach_name: string
    coach_email: string | null
    coach_phone: string | null
    status: string
    athlete_name: string
    weight_class: number | null
    submitted_club?: string | null
    submitted_dob?: string | null
    notified_at?: string | null
    notified_channel?: string | null
  }[],
): CheckInCoach[] {
  const byCoach = new Map<string, CheckInCoach>()
  for (const row of rows) {
    const existing = byCoach.get(row.coach_key)
    const athlete = {
      athleteName: row.athlete_name,
      weightClass: row.weight_class,
      status: row.status,
      submittedClub: row.submitted_club ?? null,
      submittedDob: row.submitted_dob ?? null,
    }
    if (existing) {
      existing.athletes.push(athlete)
      if (row.status === "pending") existing.hasPendingAthlete = true
      // A coach approved for one wrestler is an approved coach; the lanyard is per person.
      if (row.status === "approved") existing.status = "approved"
      // Told once is told: any stamped row means this person has heard from us.
      if (row.notified_at && !existing.notifiedAt) {
        existing.notifiedAt = row.notified_at
        existing.notifiedChannel = row.notified_channel ?? null
      }
      continue
    }
    byCoach.set(row.coach_key, {
      coachKey: row.coach_key,
      coachName: row.coach_name,
      coachEmail: row.coach_email,
      coachPhone: row.coach_phone,
      status: row.status,
      notifiedAt: row.notified_at ?? null,
      notifiedChannel: row.notified_channel ?? null,
      athletes: [athlete],
      hasPendingAthlete: row.status === "pending",
    })
  }

  for (const coach of byCoach.values()) {
    coach.athletes.sort((a, b) => (a.weightClass ?? 0) - (b.weightClass ?? 0))
  }
  return [...byCoach.values()].sort(
    (a, b) => b.athletes.length - a.athletes.length || a.coachName.localeCompare(b.coachName),
  )
}


export type KnownPerson = {
  /** The canonical key every designation for this person collapses onto. */
  key: string
  name: string | null
  email: string | null
  phone: string | null
}

/**
 * Collapses designations onto the people we already know.
 *
 * A coach named by email on one form and by mobile on another arrives as two rows and would be
 * issued two lanyards. When either detail matches somebody already in the directory, both rows
 * resolve to that person and the duplicate disappears without anyone merging it by hand — which
 * is what should have happened the first time a parent gave a number we already held.
 *
 * `identities` maps a designation's own key to the person it belongs to.
 */
export function applyKnownIdentities<
  T extends { coach_key: string; coach_email: string | null; coach_phone: string | null; coach_name: string },
>(rows: T[], identities: Map<string, KnownPerson>): T[] {
  return rows.map((row) => {
    const known = identities.get(row.coach_key)
    if (!known) return row
    return {
      ...row,
      coach_key: known.key,
      // Prefer what the family typed for the name — they know what he goes by — but fill in the
      // contact details we hold and they did not supply.
      coach_email: row.coach_email ?? known.email,
      coach_phone: row.coach_phone ?? known.phone,
    }
  })
}

/**
 * What a public form may show about somebody we already hold.
 *
 * Enough for a parent to recognise their own coach, not enough for anyone else to harvest a
 * contact. The form sends back the person's id, never these strings — the server looks up the
 * real address and number itself.
 */
export function maskEmail(email: string | null): string | null {
  const value = String(email ?? "").trim()
  const at = value.indexOf("@")
  if (at < 1) return null
  return `${value[0]}${"•".repeat(Math.max(3, at - 1))}${value.slice(at)}`
}

export function maskPhone(phone: string | null): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (digits.length < 4) return null
  return `••• ••• ${digits.slice(-4)}`
}

export type ContactRow = {
  coach_key: string
  coach_email: string | null
  coach_phone: string | null
}

/**
 * Groups designations that reach the same person, without needing them to hold an account.
 *
 * Identity resolution against the directory only merged coaches we already knew. Everyone else
 * split on how each family happened to reach them: Tom Puckett arrived by email from one and as
 * "Tommy Puckett" by mobile from another, and both were texted. Bobby Lloyd and Robert Bynum are
 * one man and one phone number under two names.
 *
 * So the contact details do the joining. Two designations sharing an email, or sharing a mobile,
 * are one coach — names are how people vary and numbers are not. A shared mobile between two
 * genuinely different coaches would merge them wrongly; at a check-in desk handing out one
 * lanyard per person, that is the safer way to be wrong.
 */
export function groupByContact(rows: readonly ContactRow[]): Map<string, string> {
  const parent = new Map<string, string>()
  const find = (k: string): string => {
    let root = k
    while (parent.get(root) && parent.get(root) !== root) root = parent.get(root)!
    return root
  }
  const union = (a: string, b: string) => {
    const [ra, rb] = [find(a), find(b)]
    if (ra !== rb) parent.set(rb, ra)
  }

  for (const row of rows) {
    const own = row.coach_key
    if (!parent.has(own)) parent.set(own, own)
    const email = String(row.coach_email ?? "").trim().toLowerCase()
    const phone = phoneKeyFor(String(row.coach_phone ?? ""))
    for (const detail of [email ? `mail:${email}` : null, phone ? `tel:${phone}` : null]) {
      if (!detail) continue
      if (!parent.has(detail)) parent.set(detail, detail)
      union(detail, own)
    }
  }

  // One key per group, preferring a known person, then an email, then whatever we have — so the
  // canonical key stays stable as more designations for the same coach arrive.
  const membersByRoot = new Map<string, string[]>()
  for (const row of rows) {
    const root = find(row.coach_key)
    membersByRoot.set(root, [...(membersByRoot.get(root) ?? []), row.coach_key])
  }

  const canonical = new Map<string, string>()
  for (const members of membersByRoot.values()) {
    const unique = [...new Set(members)].sort()
    const chosen =
      unique.find((k) => k.startsWith("user:")) ??
      unique.find((k) => !k.startsWith("tel:")) ??
      unique[0]
    for (const member of unique) canonical.set(member, chosen)
  }
  return canonical
}

export type CoachCapFlag = {
  athleteName: string
  /** Every athlete record this name resolved to. More than one is the thing to look at. */
  athleteIds: string[]
  weightClass: number | null
  /** Coach names, one per person, after identity resolution. */
  approved: string[]
  pending: string[]
  reason: "over" | "duplicate" | "would-exceed"
}

/**
 * Lower case, single spaces, punctuation folded — "Johnny O'Brien-Smith" and
 * "johnny obrien smith" are one boy.
 *
 * Apostrophes vanish and everything else separates, because they behave differently: O'Brien is
 * Obrien, while Brien-Smith is two names. Doing either to both splits a boy from himself.
 */
function athleteNameKey(name: string): string {
  return name.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
}

/**
 * Wrestlers carrying more corner coaches than the cap allows.
 *
 * The submission form already refuses a third coach, counting what an athlete has on file, so
 * nothing a family can do produces this. What can: a wrestler holding two athlete records, a row
 * edited straight in the database, or two submissions read-then-writing at the same moment. All
 * three end the same way — a fourth adult at the edge of the mat with a lanyard we printed.
 *
 * Counts people, not rows: the same coach reached by email from one family and by mobile from
 * another is one lanyard, and rows arrive here already resolved onto that person.
 *
 * Three things are worth an admin's attention, and they are not the same thing:
 *   over          — one athlete record, more approved coaches than the cap. Always wrong.
 *   duplicate     — one name across several athlete records. Usually a duplicated profile;
 *                   sometimes two wrestlers who share a name, which is why it says which.
 *   would-exceed  — within the cap today, but approving what is pending would break it. Approve
 *                   acts on a coach across every wrestler they corner, so one click can push
 *                   several athletes over at once.
 */
/** Approved beats waiting beats declined, whichever row it came from. */
function strongestStanding(
  seen: "approved" | "pending" | "declined" | undefined,
  incoming: string,
): "approved" | "pending" | "declined" {
  const rank = { approved: 2, pending: 1, declined: 0 } as const
  const next = incoming === "approved" ? "approved" : incoming === "declined" ? "declined" : "pending"
  if (!seen) return next
  return rank[next] > rank[seen] ? next : seen
}

export function coachCapFlags(
  rows: {
    athlete_id?: string | null
    athlete_name: string
    weight_class: number | null
    coach_key: string
    coach_name: string
    status: string
  }[],
  max: number = MAX_COACHES_PER_ATHLETE,
): CoachCapFlag[] {
  type Group = {
    athleteName: string
    athleteIds: Set<string>
    weightClass: number | null
    /** coach key → name and standing for this athlete. Declined is settled, not waiting. */
    coaches: Map<string, { name: string; status: "approved" | "pending" | "declined" }>
  }

  const byRecord = new Map<string, Group>()
  const recordsByName = new Map<string, string[]>()

  for (const row of rows) {
    // A row with no athlete id still belongs to somebody; fall back to the name it was filed under.
    const nameKey = athleteNameKey(row.athlete_name)
    const recordKey = row.athlete_id ? `id:${row.athlete_id}` : `name:${nameKey}`

    let group = byRecord.get(recordKey)
    if (!group) {
      group = {
        athleteName: row.athlete_name,
        athleteIds: new Set(),
        weightClass: row.weight_class,
        coaches: new Map(),
      }
      byRecord.set(recordKey, group)
      const siblings = recordsByName.get(nameKey) ?? []
      siblings.push(recordKey)
      recordsByName.set(nameKey, siblings)
    }
    if (row.athlete_id) group.athleteIds.add(row.athlete_id)
    if (group.weightClass == null) group.weightClass = row.weight_class

    const seen = group.coaches.get(row.coach_key)
    // Approved on any row for this wrestler is approved for this wrestler, and a coach still
    // waiting anywhere is still waiting.
    group.coaches.set(row.coach_key, {
      name: seen?.name ?? row.coach_name,
      status: strongestStanding(seen?.status, row.status),
    })
  }

  const split = (group: Group) => {
    const approved: string[] = []
    const pending: string[] = []
    for (const coach of group.coaches.values()) {
      if (coach.status === "approved") approved.push(coach.name)
      else if (coach.status === "pending") pending.push(coach.name)
      // Declined is neither: they are not on the floor, and approving them is not on the cards.
    }
    return { approved: approved.sort(), pending: pending.sort() }
  }

  const flags: CoachCapFlag[] = []
  const flaggedRecords = new Set<string>()

  for (const [recordKey, group] of byRecord) {
    const { approved, pending } = split(group)
    if (approved.length > max) {
      flaggedRecords.add(recordKey)
      flags.push({
        athleteName: group.athleteName,
        athleteIds: [...group.athleteIds],
        weightClass: group.weightClass,
        approved,
        pending,
        reason: "over",
      })
    }
  }

  // One name, several athlete records. Counted across the records, because a wrestler with two
  // profiles gets two full allowances and the per-record check sees nothing wrong with either.
  for (const [, recordKeys] of recordsByName) {
    if (recordKeys.length < 2) continue
    if (recordKeys.some((key) => flaggedRecords.has(key))) continue

    const groups = recordKeys.map((key) => byRecord.get(key)!)
    const coaches: Group["coaches"] = new Map()
    for (const group of groups) {
      for (const [key, coach] of group.coaches) {
        const seen = coaches.get(key)
        coaches.set(key, { name: seen?.name ?? coach.name, status: strongestStanding(seen?.status, coach.status) })
      }
    }
    const merged: Group = {
      athleteName: groups[0].athleteName,
      athleteIds: new Set(groups.flatMap((g) => [...g.athleteIds])),
      weightClass: groups.find((g) => g.weightClass != null)?.weightClass ?? null,
      coaches,
    }
    const { approved, pending } = split(merged)
    if (approved.length > max) {
      recordKeys.forEach((key) => flaggedRecords.add(key))
      flags.push({
        athleteName: merged.athleteName,
        athleteIds: [...merged.athleteIds],
        weightClass: merged.weightClass,
        approved,
        pending,
        reason: "duplicate",
      })
    }
  }

  for (const [recordKey, group] of byRecord) {
    if (flaggedRecords.has(recordKey)) continue
    const { approved, pending } = split(group)
    if (approved.length <= max && approved.length + pending.length > max) {
      flags.push({
        athleteName: group.athleteName,
        athleteIds: [...group.athleteIds],
        weightClass: group.weightClass,
        approved,
        pending,
        reason: "would-exceed",
      })
    }
  }

  const order = { over: 0, duplicate: 1, "would-exceed": 2 } as const
  return flags.sort(
    (a, b) =>
      order[a.reason] - order[b.reason] ||
      b.approved.length - a.approved.length ||
      a.athleteName.localeCompare(b.athleteName),
  )
}
