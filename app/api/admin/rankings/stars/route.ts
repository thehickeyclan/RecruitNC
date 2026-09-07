/**
 * Star ratings for the ranking board, and setting one by hand.
 *
 * Rated in one pass for a whole class so the board can show the number beside every candidate.
 * The class gate means the board's 2026, 2029 and 2030 views legitimately come back empty.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"
import { loadNationallyRankedIds } from "@/lib/national-rankings"
import { rateOneAthlete } from "@/lib/athlete-star-rating-load"
import { isRatedClass } from "@/lib/athlete-star-rating"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const year = Number(new URL(request.url).searchParams.get("year"))
  if (!isRatedClass(year)) {
    return NextResponse.json({ ratings: {}, ratedClass: false })
  }

  const admin = createAdminClient()
  const [{ data: athletes }, rankedIds] = await Promise.all([
    admin.from("athletes").select("*").eq("graduationyear", year),
    loadNationallyRankedIds(admin),
  ])

  const ratings: Record<string, unknown> = {}
  for (const athlete of athletes ?? []) {
    const rated = await rateOneAthlete(admin, athlete as Record<string, unknown>, rankedIds)
    if (rated.rating) ratings[rated.athleteId] = rated.rating
  }
  return NextResponse.json({ ratings, ratedClass: true })
}

/**
 * Set or clear a hand-set rating.
 *
 * A reason is required to set one and is stored with it. The database enforces the same thing,
 * so a star can never arrive without an account of itself.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as
    | { athleteId?: unknown; stars?: unknown; reason?: unknown }
    | null
  const athleteId = String(body?.athleteId ?? "").trim()
  if (!athleteId) return NextResponse.json({ error: "Which athlete?" }, { status: 400 })

  const clearing = body?.stars == null || body?.stars === ""
  const stars = clearing ? null : Number(body?.stars)
  const reason = String(body?.reason ?? "").trim()

  if (!clearing) {
    if (!Number.isInteger(stars) || stars! < 1 || stars! > 5) {
      return NextResponse.json({ error: "A star rating is a whole number from 1 to 5." }, { status: 400 })
    }
    if (reason.length < 10) {
      return NextResponse.json(
        { error: "Say why. The reason is shown wherever the rating is, so it needs to read as one." },
        { status: 400 },
      )
    }
  }

  // requireAdmin proves the caller is an admin but does not hand back who they are, and the
  // override is only accountable if it names a person.
  const setBy = (await (await createClient()).auth.getUser()).data.user?.id ?? null

  const admin = createAdminClient()
  const { error } = await admin
    .from("athletes")
    .update({
      star_rating_override: stars,
      star_rating_override_reason: clearing ? null : reason,
      star_rating_override_by: clearing ? null : setBy,
      star_rating_override_at: clearing ? null : new Date().toISOString(),
    })
    .eq("id", athleteId)

  if (error) {
    console.error("[rankings/stars]", error.message)
    return NextResponse.json(
      {
        error: /column .* does not exist|schema cache/i.test(error.message)
          ? "Run scripts/create-star-rating-overrides.sql first — the columns are not there yet."
          : "Could not save that.",
      },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true, athleteId, stars })
}
