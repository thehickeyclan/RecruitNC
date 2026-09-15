import { NextResponse, type NextRequest } from "next/server"

import { createAdminClientFresh } from "@/lib/supabase/admin"
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

async function loadRoster(admin: ReturnType<typeof createAdminClientFresh>): Promise<RosterAthlete[]> {
  const { data, error } = await admin
    .from("toc_invitations")
    .select('athlete_id, weight_class, seed, athletes(name, "wrestlingClub")')
    .eq("status", "confirmed")
    .in("weight_class", [...TOC_WEIGHT_CLASSES])
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as InvitationRow[])
    .map((row) => ({
      athleteId: row.athlete_id,
      name: row.athletes?.name?.trim() || "Unknown wrestler",
      club: row.athletes?.wrestlingClub?.trim() || null,
      weightClass: Number(row.weight_class),
      seed: row.seed,
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
