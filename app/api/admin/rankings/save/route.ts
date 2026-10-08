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
import { requireRankingBoardAccess } from "@/lib/rankings/ranking-board-access"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import { syncPublicRankingsTable } from "@/lib/rankings/publish-public-rankings"
import { notifyRankingsPublished } from "@/lib/rankings-notification"

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
  const body = (await request.json().catch(() => null)) as Body | null
  const year = Number(body?.year)
  const gender = String(body?.gender ?? "Male")
  const action = body?.action === "publish" ? "publish" : "save"
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "A valid graduation year is required." }, { status: 400 })
  }
  /*
   * Saving a draft needs edit access to this board, which a scoped ranker can hold. Publishing
   * stays with full admins: it makes the order public and sends a push to the app.
   */
  if (action === "publish") {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  } else {
    const auth = await requireRankingBoardAccess(gender, year, "edit")
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
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

    /*
     * Every wrestler in the order must belong to this class and gender. The board once showed the
     * boys' class under a Female filter, and a save from that screen would have replaced the girls'
     * draft with boys. Refuse the whole save rather than write half of it.
     */
    const ids = rows.map((row) => row.athlete_id)
    const strays: string[] = []
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await admin
        .from("athletes")
        .select("id, name, gender, graduationyear")
        .in("id", ids.slice(i, i + 200))
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const athlete of data ?? []) {
        const sameGender = String(athlete.gender ?? "").toLowerCase() === gender.toLowerCase()
        if (!sameGender || Number(athlete.graduationyear) !== year) strays.push(String(athlete.name))
      }
    }
    if (strays.length) {
      return NextResponse.json(
        {
          error: `Not saved: ${strays.length} wrestler(s) in this order are not ${gender} Class of ${year} (${strays
            .slice(0, 3)
            .join(", ")}${strays.length > 3 ? ", ..." : ""}). Reload the board and try again.`,
        },
        { status: 400 },
      )
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

  /*
   * Everyone outside the published cut loses their rank, whether or not they are on the draft.
   *
   * Publishing only ever wrote the draft rows, so a wrestler who had been published before and
   * later dropped off the board kept the number they were last given. The class pages hid them,
   * because those filter on the cap - but the rank stayed on the athlete's own profile, so the
   * Class of 2029 had fourteen wrestlers carrying a ranking for a published top ten, and 2027
   * had thirty-two for a top thirty.
   *
   * Clearing by exclusion rather than by draft membership is what makes "publish" mean the page
   * shows exactly this and nothing else.
   */
  const publishedIdList = draft
    .filter((row) => Number(row.rank) <= cap)
    .map((row) => String(row.athlete_id))
  const { error: clearError } = await admin
    .from("athletes")
    .update({ prospect_ranking: null, updated_at: now })
    .eq("graduationyear", year)
    .ilike("gender", gender)
    .not("prospect_ranking", "is", null)
    .not("id", "in", `(${publishedIdList.join(",")})`)
  if (clearError) {
    console.error("[rankings-save] clearing ranks outside the cut failed", clearError)
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

  /**
   * Tell the phones, from the same press that published.
   *
   * The push existed and nothing fired it. It was wired to
   * /api/admin/prospects/publish-rankings, a route no button calls any more, so every publish
   * from this board went out in silence — and a publish run straight in SQL, which is how the
   * last few went, never had a chance to send one.
   *
   * Only the published set is named, so the alert can never reveal more than the page it links
   * to, and the order comes from what was just written rather than from the screen.
   */
  const publishedIds = draft
    .filter((row) => Number(row.rank) <= cap)
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map((row) => String(row.athlete_id))
  const { data: namedRows } = await admin.from("athletes").select("id, name").in("id", publishedIds)
  const nameById = new Map((namedRows ?? []).map((r) => [String(r.id), String(r.name ?? "")]))
  const rankedNames = publishedIds.map((id) => nameById.get(id) ?? "").filter(Boolean)

  // Never throws, and deliberately not awaited into the failure path: the rankings are public
  // by now, and failing a publish because a notification failed would be the wrong trade.
  const push = await notifyRankingsPublished({ graduationYear: year, gender, rankedNames })

  return NextResponse.json({
    ok: true,
    action,
    published: Math.min(cap, draft.length),
    publishedAt: now,
    app: appSync,
    push: push ? { sent: push.sent, failed: push.failed } : { sent: 0, failed: 0, note: "not sent" },
  })
}

/** The one failure worth explaining rather than logging. */
function tableHint(message: string): string {
  return /does not exist|schema cache/i.test(message)
    ? "Run scripts/create-ranking-drafts.sql first — the draft tables are not there yet."
    : "Could not save that."
}
