import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { simulationBoutParticipants } from "@/lib/toc/bracket-simulation"

/**
 * Record who won a bout. This is the endpoint the tournament runs on.
 *
 * Built for one person entering roughly 130 results on a phone, at a mat, between matches. It
 * takes a single bout, validates it, and returns — no batching, no multi-step flow. Re-posting the
 * same bout overwrites it, so fixing a mistake is the same action as entering it.
 */

export const dynamic = "force-dynamic"

async function requireAdmin(request: NextRequest): Promise<string | null> {
  const userId = await resolveRequestUserId(request)
  if (!userId) return null
  const { data } = await createAdminClient()
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  return data?.is_admin === true ? userId : null
}

export async function POST(request: NextRequest) {
  const adminUserId = await requireAdmin(request)
  if (!adminUserId) return NextResponse.json({ error: "Admins only." }, { status: 403 })

  const body = (await request.json().catch(() => null)) as {
    weightClass?: unknown
    boutNumber?: unknown
    winnerAthleteId?: unknown
    loserAthleteId?: unknown
  } | null

  const weightClass = Number(body?.weightClass)
  const boutNumber = Number(body?.boutNumber)
  const winnerAthleteId = typeof body?.winnerAthleteId === "string" ? body.winnerAthleteId.trim() : ""

  if (!TOC_WEIGHT_CLASSES.includes(weightClass as (typeof TOC_WEIGHT_CLASSES)[number])) {
    return NextResponse.json({ error: "Unknown weight class." }, { status: 400 })
  }
  if (!Number.isInteger(boutNumber) || !winnerAthleteId) {
    return NextResponse.json({ error: "Need a bout number and a winner." }, { status: 400 })
  }

  const admin = createAdminClient()
  const draw = await getLockedDraw(admin, weightClass)
  if (!draw) return NextResponse.json({ error: "That bracket is not locked yet." }, { status: 409 })

  const bout = draw.bouts.find((b) => b.boutNumber === boutNumber)
  if (!bout) return NextResponse.json({ error: `No bout ${boutNumber} at ${weightClass}.` }, { status: 400 })

  // A winner who is not in this weight's field is a typo, and one that would quietly score every
  // entry as wrong for that bout.
  if (!draw.participants.some((p) => p.athleteId === winnerAthleteId)) {
    return NextResponse.json({ error: "That wrestler is not in this weight class." }, { status: 400 })
  }

  const loserAthleteId = typeof body?.loserAthleteId === "string" ? body.loserAthleteId.trim() || null : null

  const { error } = await admin.from("toc_bout_results").upsert(
    {
      weight_class: weightClass,
      bout_number: boutNumber,
      winner_athlete_id: winnerAthleteId,
      loser_athlete_id: loserAthleteId,
      recorded_by: adminUserId,
    },
    { onConflict: "weight_class,bout_number" },
  )

  if (error) {
    console.error("[toc pool] record result:", error.message)
    return NextResponse.json({ error: "Could not save that result." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, weightClass, boutNumber, winnerAthleteId, roundLabel: bout.roundLabel })
}

/**
 * The bouts for one weight, with who is actually in each one.
 *
 * Participants are resolved from the results already recorded — a bout's slots say "winner of 3"
 * until bout 3 has a winner. The simulation resolver does exactly this for a wrestler predicting
 * a bracket, and a recorded result is the same shape as a pick, so it is reused rather than
 * rewritten.
 */
export async function GET(request: NextRequest) {
  const adminUserId = await requireAdmin(request)
  if (!adminUserId) return NextResponse.json({ error: "Admins only." }, { status: 403 })

  const weightClass = Number(new URL(request.url).searchParams.get("weightClass"))
  if (!TOC_WEIGHT_CLASSES.includes(weightClass as (typeof TOC_WEIGHT_CLASSES)[number])) {
    return NextResponse.json({ error: "Unknown weight class." }, { status: 400 })
  }

  const admin = createAdminClient()
  const draw = await getLockedDraw(admin, weightClass)
  if (!draw) return NextResponse.json({ error: "That bracket is not locked yet.", bouts: [] }, { status: 409 })

  const { data: rows } = await admin
    .from("toc_bout_results")
    .select("bout_number,winner_athlete_id")
    .eq("weight_class", weightClass)

  const winners: Record<number, string> = {}
  for (const row of rows ?? []) winners[Number(row.bout_number)] = String(row.winner_athlete_id)

  const nameById = new Map(draw.participants.map((p) => [p.athleteId, p.name]))
  const seedById = new Map(draw.participants.map((p) => [p.athleteId, p.seed]))

  const bouts = [...draw.bouts]
    .sort((a, b) => a.boutNumber - b.boutNumber)
    .map((bout) => ({
      boutNumber: bout.boutNumber,
      roundLabel: bout.roundLabel,
      side: bout.side,
      winnerAthleteId: winners[bout.boutNumber] ?? null,
      competitors: simulationBoutParticipants(draw, winners, bout.boutNumber).map((athleteId) => ({
        athleteId,
        name: nameById.get(athleteId) ?? "Unknown",
        seed: seedById.get(athleteId) ?? null,
      })),
    }))

  return NextResponse.json({
    weightClass,
    bouts,
    recorded: Object.keys(winners).length,
    total: draw.bouts.length,
  })
}
