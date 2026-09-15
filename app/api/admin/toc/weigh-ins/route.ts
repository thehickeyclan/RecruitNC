import { NextResponse, type NextRequest } from "next/server"

import { createAdminClientFresh } from "@/lib/supabase/admin"
import { toE164 } from "@/lib/sms"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import {
  summarizeWeighIns,
  type RosterAthlete,
  type SkinCheck,
  type WeighInRecord,
} from "@/lib/toc/weigh-in"

/**
 * Friday weigh-in check-in for the scale stations and the head table.
 *
 * The roster is every confirmed wrestler from the invitations, not the locked brackets — a weight
 * mid-swap is unlocked, and its wrestlers still have to weigh in. Admins and staff with TOC field
 * access can read and record; weights of minors never leave this route.
 */

export const dynamic = "force-dynamic"

const TABLE = "toc_weigh_ins"
const MISSING_TABLE = "Run docs/sql/toc-weigh-ins.sql.txt in Supabase first."

type InvitationRow = {
  athlete_id: string
  weight_class: number
  seed: number | null
  athletes: { name: string | null; wrestlingClub: string | null } | null
}

type WeighInRow = {
  athlete_id: string
  weight_class: number
  recorded_weight: number | string | null
  skin_check: SkinCheck | null
  lanyard_given: boolean | null
  notes: string | null
  recorded_by_name: string | null
  updated_at: string | null
}

function toRecord(row: WeighInRow): WeighInRecord {
  return {
    athleteId: row.athlete_id,
    weightClass: Number(row.weight_class),
    recordedWeight: row.recorded_weight == null ? null : Number(row.recorded_weight),
    skinCheck: row.skin_check,
    lanyardGiven: row.lanyard_given === true,
    notes: row.notes,
    recordedByName: row.recorded_by_name,
    updatedAt: row.updated_at,
  }
}

type Phone = NonNullable<RosterAthlete["phones"]>[number]
type Coach = NonNullable<RosterAthlete["coaches"]>[number]

/**
 * Numbers to call when a wrestler has not come through the line: the athlete's own, then any
 * linked parent's, then the account that claimed the profile. The same order the invite reminders
 * use, loaded for the whole field in three queries — the page polls every ten seconds.
 */
async function loadPhones(
  admin: ReturnType<typeof createAdminClientFresh>,
  athleteIds: string[],
): Promise<{ phones: Map<string, Phone[]>; coaches: Map<string, Coach[]> }> {
  const out = new Map<string, Phone[]>()
  const coachMap = new Map<string, Coach[]>()
  if (athleteIds.length === 0) return { phones: out, coaches: coachMap }

  const add = (athleteId: string, label: string, raw: unknown) => {
    const text = typeof raw === "string" ? raw.trim() : ""
    const e164 = text ? toE164(text) : null
    if (!e164) return
    const list = out.get(athleteId) ?? []
    if (list.some((p) => p.e164 === e164)) return
    list.push({ label, display: text, e164 })
    out.set(athleteId, list)
  }

  const [{ data: athletes }, { data: links }] = await Promise.all([
    admin.from("athletes").select("*").in("id", athleteIds),
    admin.from("parent_athlete_links").select("athlete_id, user_id").in("athlete_id", athleteIds),
  ])

  const claimedBy = new Map<string, string>()
  for (const raw of (athletes ?? []) as Record<string, unknown>[]) {
    const id = String(raw.id)
    const own = ["cell", "cell_number", "phone"].map((k) => raw[k]).find((v) => typeof v === "string" && v.trim())
    add(id, "Athlete", own)
    if (typeof raw.claimed_by_user_id === "string") claimedBy.set(id, raw.claimed_by_user_id)
  }

  const userIds = [...new Set([...(links ?? []).map((l) => String(l.user_id)), ...claimedBy.values()])]
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, full_name, first_name, cell_phone")
      .in("user_id", userIds)
    const byUser = new Map((profiles ?? []).map((p) => [String(p.user_id), p]))
    const labelFor = (p: { full_name?: string | null; first_name?: string | null }) =>
      p.full_name?.trim() || p.first_name?.trim() || "Parent"
    for (const link of links ?? []) {
      const profile = byUser.get(String(link.user_id))
      if (profile) add(String(link.athlete_id), labelFor(profile), profile.cell_phone)
    }
    for (const [athleteId, userId] of claimedBy) {
      const profile = byUser.get(userId)
      if (profile) add(athleteId, labelFor(profile), profile.cell_phone)
    }
  }

  // Their corner coaches, listed by name whether or not we hold a number — the coach is who knows
  // where a missing wrestler is, and for a dozen wrestlers the only number on file.
  const { data: coaches } = await admin
    .from("toc_coach_designations")
    .select("athlete_id, coach_name, coach_phone")
    .in("athlete_id", athleteIds)
    .eq("status", "approved")
  for (const coach of coaches ?? []) {
    const athleteId = String(coach.athlete_id)
    const name = String(coach.coach_name ?? "").trim()
    if (!name) continue
    const list = coachMap.get(athleteId) ?? []
    if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue
    const display = typeof coach.coach_phone === "string" && coach.coach_phone.trim() ? coach.coach_phone.trim() : null
    list.push({ name, display, e164: display ? toE164(display) : null })
    coachMap.set(athleteId, list)
  }
  return { phones: out, coaches: coachMap }
}

async function loadRoster(admin: ReturnType<typeof createAdminClientFresh>): Promise<RosterAthlete[]> {
  const { data, error } = await admin
    .from("toc_invitations")
    .select('athlete_id, weight_class, seed, athletes(name, "wrestlingClub")')
    .eq("status", "confirmed")
    .in("weight_class", [...TOC_WEIGHT_CLASSES])
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as InvitationRow[]
  const { phones, coaches } = await loadPhones(admin, rows.map((row) => row.athlete_id))
  return rows
    .map((row) => ({
      athleteId: row.athlete_id,
      name: row.athletes?.name?.trim() || "Unknown wrestler",
      club: row.athletes?.wrestlingClub?.trim() || null,
      weightClass: Number(row.weight_class),
      seed: row.seed,
      phones: phones.get(row.athlete_id) ?? [],
      coaches: coaches.get(row.athlete_id) ?? [],
    }))
    .sort((a, b) => a.weightClass - b.weightClass || (a.seed ?? 99) - (b.seed ?? 99) || a.name.localeCompare(b.name))
}

export async function GET() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClientFresh()
  try {
    const roster = await loadRoster(admin)
    const { data, error } = await admin.from(TABLE).select("*")
    if (error) {
      return NextResponse.json({ error: error.code === "42P01" ? MISSING_TABLE : error.message }, { status: 500 })
    }
    const records = new Map(((data ?? []) as WeighInRow[]).map((row) => [row.athlete_id, toRecord(row)]))
    return NextResponse.json({
      roster,
      records: Object.fromEntries(records),
      summary: summarizeWeighIns(roster, records),
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load weigh-ins." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as {
    athleteId?: unknown
    recordedWeight?: unknown
    skinCheck?: unknown
    lanyardGiven?: unknown
    notes?: unknown
  } | null

  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  if (!athleteId) return NextResponse.json({ error: "Choose a wrestler." }, { status: 400 })

  const recordedWeight =
    body?.recordedWeight == null || body.recordedWeight === "" ? null : Number(body.recordedWeight)
  if (recordedWeight != null && (!Number.isFinite(recordedWeight) || recordedWeight < 60 || recordedWeight > 400)) {
    return NextResponse.json({ error: "Enter the weight the scale shows, e.g. 132.6." }, { status: 400 })
  }
  const skinCheck = body?.skinCheck === "pass" || body?.skinCheck === "fail" ? body.skinCheck : null
  const lanyardGiven = body?.lanyardGiven === true
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null

  const admin = createAdminClientFresh()

  // Only a confirmed wrestler can be weighed in, and always at their confirmed weight.
  const { data: invitation } = await admin
    .from("toc_invitations")
    .select("weight_class")
    .eq("athlete_id", athleteId)
    .eq("status", "confirmed")
    .maybeSingle()
  if (!invitation) return NextResponse.json({ error: "That wrestler is not confirmed for the tournament." }, { status: 404 })

  const { data: profile } = await admin
    .from("user_profiles")
    .select("full_name, first_name, last_name, email")
    .eq("user_id", auth.userId)
    .maybeSingle()
  const recordedByName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    profile?.email ||
    null

  const now = new Date().toISOString()
  const { data, error } = await admin
    .from(TABLE)
    .upsert(
      {
        athlete_id: athleteId,
        weight_class: Number(invitation.weight_class),
        recorded_weight: recordedWeight,
        skin_check: skinCheck,
        lanyard_given: lanyardGiven,
        notes,
        recorded_by: auth.userId,
        recorded_by_name: recordedByName,
        updated_at: now,
      },
      { onConflict: "athlete_id" },
    )
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.code === "42P01" ? MISSING_TABLE : error.message }, { status: 500 })
  }
  return NextResponse.json({ record: toRecord(data as WeighInRow) })
}
