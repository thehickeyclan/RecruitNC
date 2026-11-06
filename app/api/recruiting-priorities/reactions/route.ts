import { after, NextResponse, type NextRequest } from "next/server"

import { siteFromRequest } from "@/lib/analytics-site"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { recordCommandCenterAction } from "@/lib/recruiting/cc-activation"
import { cleanReaction, isReactionKind } from "@/lib/recruiting/priorities/reactions"
import { reactionSharing } from "@/lib/recruiting/priorities/sharing"
import { loadFamilySets, respondentFor, TABLE_MISSING } from "@/lib/recruiting/priorities/store"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Reactions on the suggested colleges (priorities part 4). Only the wrestler's linked parent or the
 * wrestler's own login: respondentFor() admits no one else, coaches included. The signed-in login
 * only, never a "view as".
 */
async function caller(athleteId: unknown) {
  if (typeof athleteId !== "string" || !athleteId) return null
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !hasPortalAccess(viewer)) return null
  const respondent = await respondentFor(admin, userId, athleteId)
  return respondent ? { admin, userId, athleteId, respondent } : null
}

/** React to one card: { athleteId, batchId, schoolId, reaction, reason?, chips? }. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const c = await caller(body?.athleteId)
  if (!c) return NextResponse.json({ error: "Not available" }, { status: 403 })
  const reaction = body?.reaction
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : ""
  const batchId = typeof body?.batchId === "string" ? body.batchId : ""
  if (!isReactionKind(reaction) || !schoolId || !batchId) return NextResponse.json({ error: "Pick a reaction." }, { status: 400 })

  // The card must be one this respondent was shown: a reaction is tied to the batch that prompted it.
  const { data: batch, error: batchErr } = await c.admin
    .from("suggestion_batches")
    .select("id, items")
    .eq("id", batchId)
    .eq("athlete_id", c.athleteId)
    .eq("respondent", c.respondent)
    .maybeSingle()
  if (batchErr?.code === TABLE_MISSING) return NextResponse.json({ error: "This is being switched on. Try again shortly." }, { status: 503 })
  const cards = ((batch?.items as { cards?: Array<{ id?: string }> } | null)?.cards ?? []).map((x) => x.id)
  if (!batch || !cards.includes(schoolId)) return NextResponse.json({ error: "That college is not on this list." }, { status: 400 })

  const { reason, chips } = cleanReaction(reaction, body?.reason, body?.chips)
  // A Cost reason takes the class the parent gave the budget (Constraint-only unless they changed it).
  let budgetClass: "shared" | "constraint" | "private" = "constraint"
  if (reason === "cost") {
    const sets = await loadFamilySets(c.admin, c.athleteId).catch(() => null)
    budgetClass = sets?.parent?.answers.find((a) => a.key === "budget")?.sharing ?? "constraint"
  }
  const { error } = await c.admin.from("suggestion_reactions").insert({
    batch_id: batchId,
    athlete_id: c.athleteId,
    school_id: schoolId,
    respondent: c.respondent,
    reacted_by: c.userId,
    reaction,
    reason,
    chips,
    sharing: reactionSharing(reaction, reason, budgetClass),
  })
  if (error) {
    console.error("[priorities/reactions] save failed", error.message)
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 })
  }

  // "Worth a closer look" saves to the reactor's own My List. A college already there keeps its stage.
  let saved = false
  if (reaction === "closer_look") {
    const { data: existing } = await c.admin.from("college_list_items").select("id").eq("user_id", c.userId).eq("school_id", schoolId).maybeSingle()
    if (!existing) {
      const now = new Date().toISOString()
      const { error: saveErr } = await c.admin.from("college_list_items").insert({ user_id: c.userId, school_id: schoolId, status: "interested", updated_at: now })
      if (saveErr) console.error("[priorities/reactions] my list save failed", saveErr.message)
      else {
        saved = true
        const site = siteFromRequest(request)
        after(() => recordCommandCenterAction(c.admin, { userId: c.userId, action: "school_saved", site, schoolId, athleteId: c.athleteId }))
      }
    }
  }
  return NextResponse.json({ ok: true, saved, sharing: reactionSharing(reaction, reason, budgetClass) })
}

/** Undo: clears this login's reactions on one college for this wrestler. My List is left as it is. */
export async function DELETE(request: NextRequest) {
  const c = await caller(request.nextUrl.searchParams.get("athleteId"))
  if (!c) return NextResponse.json({ error: "Not available" }, { status: 403 })
  const schoolId = request.nextUrl.searchParams.get("schoolId") ?? ""
  const { error } = await c.admin
    .from("suggestion_reactions")
    .delete()
    .eq("athlete_id", c.athleteId)
    .eq("respondent", c.respondent)
    .eq("reacted_by", c.userId)
    .eq("school_id", schoolId)
  if (error) return NextResponse.json({ error: "Could not undo. Try again." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
