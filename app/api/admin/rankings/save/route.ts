/**
 * Save the working order, and publish it — two steps, deliberately.
 *
 * The board had one button and it wrote `athletes.prospect_ranking` directly, so there was no
 * way to work on an order without it being live the moment you moved somebody. Saving writes a
 * draft; publishing copies the draft out to the public ranking.
 */
import { NextResponse, type NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import { syncPublicRankingsTable } from "@/lib/rankings/publish-public-rankings"

export const dynamic = "force-dynamic"

/** Publishing now rebuilds the class to fill the app's cards, which is the slow part. */
export const maxDuration = 60

type Body = {
  action?: "save" | "publish"
  year?: unknown
  gender?: unknown
  rankings?: Array<{ id?: string; final_rank?: number }>
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as Body | null
  const year = Number(body?.year)
  const gender = String(body?.gender ?? "Male")
  const action = body?.action === "publish" ? "publish" : "save"
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "A valid graduation year is required." }, { status: 400 })
  }

  const admin = createAdminClient()
  const userId = (await (await createClient()).auth.getUser()).data.user?.id ?? null
  const now = new Date().toISOString()

  if (action === "save") {
    const rows = (body?.rankings ?? [])
      .map((row) => ({ athlete_id: String(row.id ?? ""), rank: Number(row.final_rank) }))
      .filter((row) => row.athlete_id && Number.isInteger(row.rank) && row.rank >= 1)
    if (!rows.length) {
      return NextResponse.json({ error: "No order to save." }, { status: 400 })
    }

    // Replace the draft wholesale: an athlete dropped from the order should not linger in it.
    const { error: clearError } = await admin
      .from("ranking_drafts")
      .delete()
      .eq("class_year", year)
      .eq("gender", gender)
    if (clearError) return NextResponse.json({ error: tableHint(clearError.message) }, { status: 500 })

    const { error } = await admin
      .from("ranking_drafts")
      .insert(rows.map((row) => ({ ...row, class_year: year, gender })))
    if (error) return NextResponse.json({ error: tableHint(error.message) }, { status: 500 })

    await admin
      .from("ranking_editions")
      .upsert(
        { class_year: year, gender, draft_saved_at: now, draft_saved_by: userId },
        { onConflict: "class_year,gender" },
      )

    return NextResponse.json({ ok: true, action, saved: rows.length, draftSavedAt: now })
  }

  // Publish: the saved draft becomes the public ranking. Nothing on screen is published — only
  // what was saved, so publishing can never ship an order nobody reviewed.
  const { data: draft, error: draftError } = await admin
    .from("ranking_drafts")
    .select("athlete_id, rank")
    .eq("class_year", year)
    .eq("gender", gender)
    .order("rank", { ascending: true })
  if (draftError) return NextResponse.json({ error: tableHint(draftError.message) }, { status: 500 })
  if (!draft?.length) {
    return NextResponse.json({ error: "Nothing saved to publish. Save the order first." }, { status: 400 })
  }

  const cap = getPublicRankingsMax(year)
  const results = await Promise.all(
    draft.map((row) =>
      admin
        .from("athletes")
        .update({
          // Everyone below the cut stays on the board and off the public page.
          prospect_ranking: Number(row.rank) <= cap ? Number(row.rank) : null,
          updated_at: now,
        })
        .eq("id", String(row.athlete_id)),
    ),
  )
  const failed = results.filter((r) => r.error)
  if (failed.length) {
    return NextResponse.json({ error: `${failed.length} athletes failed to publish.` }, { status: 500 })
  }

  await admin
    .from("ranking_editions")
    .upsert({ class_year: year, gender, published_at: now, published_by: userId }, { onConflict: "class_year,gender" })

  // The public page caches its class rankings; a publish must show up.
  revalidateTag("public-rankings")
  revalidateTag("admin-ranking-board")

  /**
   * The iPhone app reads `public_rankings`, not `athletes.prospect_ranking`.
   *
   * These were two separate publishes with two separate buttons, and only one of them was on the
   * board where the work happens — so the app drifted three weeks behind the web without anything
   * saying so. One press now updates both.
   */
  const appSync = await syncPublicRankingsTable({
    admin,
    year,
    gender,
    cap,
    publishedAt: now,
    draft: draft.map((row) => ({ athlete_id: String(row.athlete_id), rank: Number(row.rank) })),
  })

  return NextResponse.json({
    ok: true,
    action,
    published: Math.min(cap, draft.length),
    publishedAt: now,
    app: appSync,
  })
}

/** The one failure worth explaining rather than logging. */
function tableHint(message: string): string {
  return /does not exist|schema cache/i.test(message)
    ? "Run scripts/create-ranking-drafts.sql first — the draft tables are not there yet."
    : "Could not save that."
}
