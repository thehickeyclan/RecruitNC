import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { TOC_POOL_DEADLINE, TOC_POOL_OPENS, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { tocBracketsPublicEnabled } from "@/lib/toc/bracket-public-access"
import { validateFinalPrediction, type FinalPrediction } from "@/lib/toc/final-prediction"

/**
 * An entrant's picks for one weight class.
 *
 * Picks are validated against the official locked draw, not accepted as given: a bout number that
 * is not in the draw, or a wrestler who is not in that bout, cannot be scored and would sit in the
 * database looking like a real pick.
 */

export const dynamic = "force-dynamic"

function isOpen(now: Date): { open: boolean; reason?: string } {
  // Entries are picks against the official draw. While brackets are still private, everyone is
  // looking at their own projected seeding, so a pick for "bout 1" means a different pairing for
  // every entrant — accepted by the validator, and scored against a bracket they never saw.
  // The pool cannot open before the brackets do, whatever the calendar says.
  if (!tocBracketsPublicEnabled()) {
    return { open: false, reason: "The pool opens when official brackets are released." }
  }
  if (now < TOC_POOL_OPENS) return { open: false, reason: "The pool opens when official brackets are released." }
  if (now > TOC_POOL_DEADLINE) return { open: false, reason: "The deadline has passed. Entries are locked." }
  return { open: true }
}

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to see your entries." }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("toc_pool_entries")
    .select("weight_class,picks,submitted,submitted_at,updated_at,final_method,final_winner_score,final_loser_score")
    .eq("user_id", userId)

  if (error) {
    console.error("[toc pool] load entries:", error.message)
    return NextResponse.json({ error: "Could not load your entries." }, { status: 500 })
  }

  const now = new Date()
  return NextResponse.json({
    entries: data ?? [],
    window: { opensAt: TOC_POOL_OPENS.toISOString(), deadline: TOC_POOL_DEADLINE.toISOString(), ...isOpen(now) },
  })
}

export async function POST(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to enter the pool." }, { status: 401 })

  const now = new Date()
  const window = isOpen(now)
  if (!window.open) return NextResponse.json({ error: window.reason }, { status: 409 })

  const body = (await request.json().catch(() => null)) as {
    weightClass?: unknown
    picks?: unknown
    submitted?: unknown
    finalPrediction?: { method?: unknown; winnerScore?: unknown; loserScore?: unknown }
  } | null

  const weightClass = Number(body?.weightClass)
  if (!TOC_WEIGHT_CLASSES.includes(weightClass as (typeof TOC_WEIGHT_CLASSES)[number])) {
    return NextResponse.json({ error: "Unknown weight class." }, { status: 400 })
  }

  const admin = createAdminClient()
  const draw = await getLockedDraw(admin, weightClass)
  if (!draw) {
    return NextResponse.json({ error: "That bracket has not been released yet." }, { status: 409 })
  }

  // Only bouts that exist, and only wrestlers who are in the field. Anything else is a pick that
  // could never score, and storing it would make an entry look complete when it is not.
  const boutNumbers = new Set(draw.bouts.map((b) => b.boutNumber))
  const athleteIds = new Set(draw.participants.map((p) => p.athleteId))

  const raw = (body?.picks ?? {}) as Record<string, unknown>
  const picks: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const bout = Number(key)
    const athleteId = typeof value === "string" ? value.trim() : ""
    if (!Number.isInteger(bout) || !boutNumbers.has(bout)) continue
    if (!athleteId || !athleteIds.has(athleteId)) continue
    picks[String(bout)] = athleteId
  }

  const submitted = body?.submitted === true

  // The tiebreaker. Required to submit, because a submitted entry with no tiebreaker cannot be
  // separated from a level one — and a rule discovered at the medal stand is no rule at all.
  let finalPrediction: FinalPrediction | null = null
  if (body?.finalPrediction) {
    const parsed = validateFinalPrediction(body.finalPrediction)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    finalPrediction = parsed.value
  }
  if (submitted && !finalPrediction) {
    return NextResponse.json(
      { error: "Pick how the final ends — it is the tiebreaker." },
      { status: 400 },
    )
  }

  const { error } = await admin.from("toc_pool_entries").upsert(
    {
      user_id: userId,
      weight_class: weightClass,
      picks,
      submitted,
      ...(finalPrediction
        ? {
            final_method: finalPrediction.method,
            final_winner_score: finalPrediction.winnerScore,
            final_loser_score: finalPrediction.loserScore,
          }
        : {}),
      // First submit stamps the time; later edits before the deadline leave it alone.
      ...(submitted ? { submitted_at: now.toISOString() } : {}),
    },
    { onConflict: "user_id,weight_class" },
  )

  if (error) {
    console.error("[toc pool] save entry:", error.message)
    return NextResponse.json({ error: "Could not save your bracket." }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    weightClass,
    submitted,
    picksAccepted: Object.keys(picks).length,
    boutsInDraw: boutNumbers.size,
  })
}
