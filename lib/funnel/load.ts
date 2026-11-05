import type { SupabaseClient } from "@supabase/supabase-js"
import { currentClassYears } from "@/lib/class-years"
import { countsAsCoachView } from "@/lib/coach-view-rule"
import { isInternalAccount } from "@/lib/internal-accounts"
import { inState } from "@/lib/recruiting/states"
import { sourceLabel, type FirstTouch } from "@/lib/traffic-source"
import { readinessParts } from "@/lib/funnel/readiness"
import type { FunnelAthlete, FunnelState } from "@/lib/funnel/compute"

/**
 * Reads everything the funnel dashboard counts, for North Carolina and South Carolina's current
 * classes. Paged by id: PostgREST stops at 1,000 rows and says nothing (lib/funnel/compute.ts).
 */

type Row = Record<string, unknown>

async function pageAll(fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
    if (from > 500_000) break
  }
  return out
}

async function inChunks<T>(ids: readonly string[], size: number, run: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += size) out.push(...(await run(ids.slice(i, i + size))))
  return out
}

const earliest = (a: string | null | undefined, b: string | null | undefined) => (!a ? b ?? null : !b ? a : a < b ? a : b)
const latest = (...xs: (string | null | undefined)[]) => (xs.some((x) => !x) ? null : (xs as string[]).reduce((m, x) => (x > m ? x : m)))

export async function loadFunnel(admin: SupabaseClient, now = new Date()): Promise<{ rows: FunnelAthlete[]; windowStart: string; checkoutsByPage: Record<string, number> }> {
  const years = currentClassYears(now)
  const windowStart = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const cols = "id, state, graduationyear, claimed_by_user_id, claimed_at, academic_gpa, academic_gpa_updated_at, phone, academic_interest"
  const [nc, sc] = await Promise.all(
    (["NC", "SC"] as const).map((st) =>
      pageAll((from, to) => inState(admin.from("athletes").select(cols).in("graduationyear", years), st).order("id").range(from, to)),
    ),
  )
  const athletes = [...nc.map((r) => ({ ...r, _state: "NC" as FunnelState })), ...sc.map((r) => ({ ...r, _state: "SC" as FunnelState }))]
  const ids = athletes.map((a) => String(a.id))
  const idSet = new Set(ids)

  const [links, consents, audits, blue, stars] = await Promise.all([
    inChunks(ids, 300, async (c) => (await admin.from("parent_athlete_links").select("user_id, athlete_id, created_at").in("athlete_id", c)).data ?? []),
    inChunks(ids, 300, async (c) => (await admin.from("profile_claim_consents").select("athlete_id, user_id, created_at").in("athlete_id", c)).data ?? []),
    inChunks(ids, 300, async (c) =>
      (await admin.from("athlete_audit_log").select("athlete_id, field_name, new_value, created_at").in("athlete_id", c).in("field_name", ["academic_gpa", "phone", "academic_interest"])).data ?? [],
    ),
    admin.from("blue_wiq_subscriptions").select("athlete_id, status").in("status", ["active", "grace", "paused"]).then((r) => r.data ?? []),
    inChunks(ids, 300, async (c) => (await admin.from("college_coach_stars").select("athlete_id, coach_user_id, starred_at").in("athlete_id", c)).data ?? []),
  ])

  // Owners: the athlete himself and every linked parent. A claim by our own staff is a test, not a family.
  const ownersOf = new Map<string, Set<string>>()
  const addOwner = (athleteId: string, userId: unknown) => {
    if (typeof userId !== "string" || !userId) return
    const set = ownersOf.get(athleteId) ?? new Set<string>()
    set.add(userId)
    ownersOf.set(athleteId, set)
  }
  for (const a of athletes) addOwner(String(a.id), a.claimed_by_user_id)
  for (const l of links as Row[]) addOwner(String(l.athlete_id), l.user_id)
  const ownerIds = [...new Set([...ownersOf.values()].flatMap((s) => [...s]))]
  const people = await inChunks(ownerIds, 300, async (c) => (await admin.from("user_profiles").select("user_id, email, cell_phone, created_at").in("user_id", c)).data ?? [])
  const person = new Map((people as Row[]).map((p) => [String(p.user_id), p]))
  const internal = (u: string) => isInternalAccount(person.get(u)?.email as string | undefined)

  const [subs, collegeItems, events, coachViewers] = await Promise.all([
    pageAll((from, to) => admin.from("recruitnc_subscriptions").select("id, user_id, plan, created_at").not("status", "in", "(incomplete,incomplete_expired)").order("id").range(from, to)),
    inChunks(ownerIds, 200, async (c) => (await admin.from("college_list_items").select("user_id, created_at").in("user_id", c)).data ?? []),
    pageAll((from, to) =>
      admin
        .from("user_analytics")
        .select("id, user_id, event_type, event_data, page_url, created_at")
        .in("event_type", ["profile_claimed", "claim_started", "recruiting_ready", "checkout_started"])
        .order("id")
        .range(from, to),
    ),
    pageAll((from, to) =>
      admin.from("user_profiles").select("user_id, email, role, profile_type, verified_coach, is_admin, school_id").eq("verified_coach", true).order("user_id").range(from, to),
    ),
  ])

  // Coaches by the rule the families' views panel uses; the program is the coach's school record.
  const coachProgram = new Map<string, string>()
  for (const v of coachViewers) if (countsAsCoachView(v as never)) coachProgram.set(String(v.user_id), String(v.school_id ?? v.user_id))
  const coachIds = [...coachProgram.keys()]
  const coachViews = await inChunks(coachIds, 100, (c) =>
    pageAll((from, to) =>
      admin.from("user_analytics").select("id, user_id, event_data, created_at").eq("event_type", "profile_view").in("user_id", c).order("id").range(from, to),
    ),
  )
  const familyViews = await pageAll((from, to) =>
    admin.from("user_analytics").select("id, user_id, event_data").eq("event_type", "profile_view").gte("created_at", windowStart).order("id").range(from, to),
  )

  const byAthlete = <T extends Row>(xs: T[], key = "athlete_id") => {
    const m = new Map<string, T[]>()
    for (const x of xs) {
      const id = String((x[key] as string) ?? (x.event_data as Row | null)?.athlete_id ?? "")
      if (!idSet.has(id)) continue
      m.set(id, [...(m.get(id) ?? []), x])
    }
    return m
  }
  const linksBy = byAthlete(links as Row[])
  const consentsBy = byAthlete(consents as Row[])
  const auditBy = byAthlete(audits as Row[])
  const starsBy = byAthlete(stars as Row[])
  const eventsBy = byAthlete(events.filter((e) => (e.event_data as Row | null)?.athlete_id) as Row[], "_none")
  const blueSet = new Set((blue as Row[]).map((b) => String(b.athlete_id)))

  const subsBy = new Map<string, Row[]>()
  for (const s of subs) subsBy.set(String(s.user_id), [...(subsBy.get(String(s.user_id)) ?? []), s])
  const fifthCollege = new Map<string, string>()
  const itemsBy = new Map<string, string[]>()
  for (const it of collegeItems as Row[]) itemsBy.set(String(it.user_id), [...(itemsBy.get(String(it.user_id)) ?? []), String(it.created_at)])
  for (const [u, ts] of itemsBy) if (ts.length >= 5) fifthCollege.set(u, ts.sort()[4])

  const coachBy = new Map<string, { at: string; program: string }[]>()
  for (const v of coachViews) {
    const id = String((v.event_data as Row | null)?.athlete_id ?? "")
    if (!idSet.has(id)) continue
    coachBy.set(id, [...(coachBy.get(id) ?? []), { at: String(v.created_at), program: coachProgram.get(String(v.user_id)) ?? String(v.user_id) }])
  }
  for (const [id, list] of starsBy) {
    for (const s of list) {
      const program = coachProgram.get(String(s.coach_user_id))
      if (program) coachBy.set(id, [...(coachBy.get(id) ?? []), { at: String(s.starred_at), program }])
    }
  }
  const familyViewCount = new Map<string, number>()
  for (const v of familyViews) {
    if (v.user_id && coachProgram.has(String(v.user_id))) continue
    const id = String((v.event_data as Row | null)?.athlete_id ?? "")
    if (idSet.has(id)) familyViewCount.set(id, (familyViewCount.get(id) ?? 0) + 1)
  }

  const checkoutsByPage: Record<string, number> = {}
  for (const e of events) {
    if (e.event_type !== "checkout_started" || (e.created_at as string) < windowStart) continue
    const page = String(e.page_url ?? "/").replace(/^\/(view-profile|athletes?)\b.*/, "/view-profile")
    checkoutsByPage[page] = (checkoutsByPage[page] ?? 0) + 1
  }

  const rows: FunnelAthlete[] = []
  for (const a of athletes) {
    const id = String(a.id)
    const owners = [...(ownersOf.get(id) ?? [])].filter((u) => !internal(u))
    const claimed = owners.length > 0
    const claimTimes = [
      a.claimed_by_user_id && owners.includes(String(a.claimed_by_user_id)) ? (a.claimed_at as string | null) : null,
      ...(linksBy.get(id) ?? []).filter((l) => owners.includes(String(l.user_id))).map((l) => String(l.created_at)),
      ...(consentsBy.get(id) ?? []).filter((c) => owners.includes(String(c.user_id))).map((c) => String(c.created_at)),
    ].filter((t): t is string => Boolean(t))
    const claimedAt = claimed ? claimTimes.sort()[0] ?? null : null
    const ev = eventsBy.get(id) ?? []
    const claimEvent = ev.filter((e) => e.event_type === "profile_claimed").sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)))[0]
    const touch = (claimEvent?.event_data as Row | undefined)?.first_touch as FirstTouch | null | undefined

    const parentCells = owners.filter((u) => u !== a.claimed_by_user_id).map((u) => person.get(u)?.cell_phone)
    const ownCell = a.claimed_by_user_id ? person.get(String(a.claimed_by_user_id))?.cell_phone : null
    const parts = readinessParts({ gpa: a.academic_gpa, athleteCell: a.phone || ownCell, parentCells, major: a.academic_interest })
    const firstSet = (field: string) =>
      (auditBy.get(id) ?? [])
        .filter((r) => r.field_name === field && String(r.new_value ?? "").trim())
        .map((r) => String(r.created_at))
        .sort()[0] ?? null
    const parentCellAt = owners
      .filter((u) => String(person.get(u)?.cell_phone ?? "").trim())
      .map((u) => String(person.get(u)?.created_at ?? ""))
      .filter(Boolean)
      .sort()[0]
    const readyEvent = ev.filter((e) => e.event_type === "recruiting_ready").map((e) => String(e.created_at)).sort()[0] ?? null
    const readyAt =
      parts.gpa && parts.cell && parts.major
        ? readyEvent ??
          latest(
            earliest(a.academic_gpa_updated_at as string | null, firstSet("academic_gpa")),
            earliest(firstSet("phone"), parentCellAt ?? null),
            firstSet("academic_interest"),
          )
        : null

    const ownSubs = owners.flatMap((u) => subsBy.get(u) ?? [])
    const insiderAt = ownSubs.map((s) => String(s.created_at)).sort()[0] ?? null
    const commandCenterAt = ownSubs.filter((s) => s.plan === "command_center").map((s) => String(s.created_at)).sort()[0] ?? null
    const activatedAt = commandCenterAt ? owners.map((u) => fifthCollege.get(u)).filter((t): t is string => Boolean(t)).sort()[0] ?? null : null
    const coach = coachBy.get(id) ?? []

    rows.push({
      id,
      state: a._state,
      classYear: Number(a.graduationyear),
      claimedAt,
      source: claimed ? sourceLabel(touch ?? null) : "unclaimed",
      gpa: claimed && parts.gpa,
      cell: claimed && parts.cell,
      major: claimed && parts.major,
      readyAt: claimed ? readyAt : null,
      insiderAt,
      commandCenterAt,
      activatedAt,
      blue: blueSet.has(id),
      claimStartedAt: ev.filter((e) => e.event_type === "claim_started").map((e) => String(e.created_at)).sort()[0] ?? null,
      familyViews: familyViewCount.get(id) ?? 0,
      coachPrograms30: new Set(coach.filter((c) => c.at >= windowStart).map((c) => c.program)).size,
      firstCoachAt: coach.map((c) => c.at).sort()[0] ?? null,
    })
  }
  return { rows, windowStart, checkoutsByPage }
}
