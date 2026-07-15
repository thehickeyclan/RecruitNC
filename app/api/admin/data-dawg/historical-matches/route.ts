import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const status = request.nextUrl.searchParams.get("status") || "needs_review"
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "100"), 1), 500)
  const admin = createAdminClient()

  let query = admin
    .from("winningest_wrestlers")
    .select(
      "id, wrestler_name, school, year, record, wins, losses, rank_position, rank_numeric, is_tied, athlete_id, school_id, match_status, match_confidence, match_reasons, source_record_id",
    )
    .order("wins", { ascending: false })
    .limit(limit)

  if (status !== "all") {
    query = query.eq("match_status", status)
  } else {
    query = query.in("match_status", ["needs_review", "unmatched"])
  }

  const { data, error } = await query
  if (error) {
    console.error("[RecruitNC] historical-matches GET", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const athleteIds = [
    ...new Set((data ?? []).map((r) => r.athlete_id).filter(Boolean) as string[]),
  ]
  // Also load proposed ids from match_reasons? We store athlete_id only on match.
  // For needs_review, proposed may be in match_reasons only — import stores proposed separately.
  // Re-query athletes that appear as athlete_id; for review rows without athlete_id
  // look up by name for display candidates.
  const names = [...new Set((data ?? []).map((r) => r.wrestler_name).filter(Boolean))]
  const athletesById = new Map<string, { id: string; name: string; highschool: string | null; graduationyear: unknown }>()

  if (athleteIds.length) {
    const { data: ath } = await admin
      .from("athletes")
      .select("id, name, highschool, graduationyear")
      .in("id", athleteIds)
    for (const a of ath ?? []) {
      athletesById.set(String(a.id), {
        id: String(a.id),
        name: String(a.name),
        highschool: a.highschool ?? null,
        graduationyear: a.graduationyear ?? null,
      })
    }
  }

  const nameHints = new Map<string, { id: string; name: string; highschool: string | null; graduationyear: unknown }[]>()
  for (const n of names.slice(0, 80)) {
    const { data: hits } = await admin
      .from("athletes")
      .select("id, name, highschool, graduationyear")
      .ilike("name", n)
      .limit(5)
    nameHints.set(
      n,
      (hits ?? []).map((a) => ({
        id: String(a.id),
        name: String(a.name),
        highschool: a.highschool ?? null,
        graduationyear: a.graduationyear ?? null,
      })),
    )
  }

  const { count: needsReviewCount } = await admin
    .from("winningest_wrestlers")
    .select("id", { count: "exact", head: true })
    .eq("match_status", "needs_review")

  const items = (data ?? []).map((row) => {
    const reasons = Array.isArray(row.match_reasons)
      ? row.match_reasons.map(String)
      : []
    const proposedFromReasons = reasons
      .find((r) => r.startsWith("proposed_athlete:"))
      ?.slice("proposed_athlete:".length)
    const name_candidates = nameHints.get(String(row.wrestler_name)) ?? []
    if (
      proposedFromReasons &&
      !name_candidates.some((c) => c.id === proposedFromReasons) &&
      !athletesById.has(proposedFromReasons)
    ) {
      // leave candidate list; UI may still pick from name hits
    }
    return {
      ...row,
      linked_athlete: row.athlete_id ? athletesById.get(String(row.athlete_id)) ?? null : null,
      proposed_athlete_id: proposedFromReasons || row.athlete_id || null,
      name_candidates,
    }
  })

  return NextResponse.json({
    items,
    needsReviewCount: needsReviewCount ?? 0,
  })
}
