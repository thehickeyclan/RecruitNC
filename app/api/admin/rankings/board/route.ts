import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import { buildRecruitNcRankingBoard } from "@/lib/rankings/recruitnc-ranking-engine"

export const dynamic = "force-dynamic"

/**
 * A cold build is the slowest request this app serves — measured at 19.6s in production for the
 * Class of 2027, and the cache only holds for ten minutes, so the first visitor after it expires
 * pays that in full. Every other heavy route here sets its own limit; this one, the heaviest, was
 * left on the platform default and was one slow class away from returning 504 to an admin who
 * would only see a spinner.
 */
export const maxDuration = 60

/**
 * Cached for ten minutes, per class and gender.
 *
 * Building a class means loading a tournament bundle, a season of matches, duals and qualifier
 * head-to-head for every athlete in it — forty-five seconds for the Class of 2027, and the page
 * was unusable. A published ranking changes when staff publish one; ten minutes of staleness on a
 * review tool costs nothing, and `?refresh=1` skips the cache when you have just changed
 * something and want to see it.
 */
const cachedBoard = unstable_cache(
  async (year: string, gender: string) =>
    buildRecruitNcRankingBoard({ supabase: createAdminClient(), year, gender }),
  // Bump this version whenever `RankingBoardAthlete` changes shape. The cache outlives a deploy,
  // so a payload built by older code is otherwise served to newer code: `all_american` went from
  // `string | null` to `string[]` while the key stayed "v1", and the board threw
  // "t.map is not a function" on every cached class until the entry expired.
  // v3: draft_rank, toc_result, and class-qualified standings on significant wins and losses.
  // A cached v2 payload has none of them, and serving one to this code is what broke the board.
  ["admin-ranking-board", "v3"],
  { revalidate: 600, tags: ["admin-ranking-board"] },
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2027"
    const gender = searchParams.get("gender") || "Male"
    const fresh = searchParams.get("refresh") === "1"
    const [athletes, edition, excluded, draftRanks] = await Promise.all([
      fresh
        ? buildRecruitNcRankingBoard({ supabase: createAdminClient(), year, gender })
        : cachedBoard(year, gender),
      // Never cached: the whole point of the timestamps is that they are current.
      // The draft tables may not exist yet, so this must never take the board down with it.
      (async () => {
        try {
          const { data } = await createAdminClient()
            .from("ranking_editions")
            .select("draft_saved_at, published_at")
            .eq("class_year", Number(year))
            .eq("gender", gender)
            .maybeSingle()
          return data ?? null
        } catch {
          return null
        }
      })(),
      /*
       * Who this class query silently dropped.
       *
       * The board filters on gender, and a null never matches — so an athlete with that one
       * field unset vanished from every board with nothing saying so. Seven were missing this
       * way, including Miller Menteer, whom RankWrestler had 30th in the Class of 2027, and a
       * wrestler with sixty-three matches on file. A class quietly three athletes short looks
       * exactly like a class that is complete.
       *
       * Reported rather than included: guessing at gender on a minor's record is worse than
       * showing an admin that a record needs a field.
       */
      (async () => {
        try {
          const { data } = await createAdminClient()
            .from("athletes")
            .select("id, name, highschool")
            .eq("graduationyear", Number(year))
            .eq("is_nc_athlete", true)
            .is("gender", null)
          return (data ?? []).map((row) => ({
            id: String(row.id),
            name: String(row.name ?? "Unnamed"),
            highschool: (row.highschool as string) ?? null,
          }))
        } catch {
          return [] as Array<{ id: string; name: string; highschool: string | null }>
        }
      })(),
      /*
       * The saved draft, which is the working order.
       *
       * Saving wrote `ranking_drafts` and nothing ever read it back, so the board rebuilt itself
       * from `athletes.prospect_ranking` on every load — the last *published* order. An admin
       * would spend an evening reordering a class, press Save, reload, and be looking at the
       * published order again with no indication their work was anywhere. It was: the rows were
       * in the table the whole time, unread.
       *
       * Never cached, for the same reason the timestamps are not: a draft saved thirty seconds
       * ago has to be on screen now. Missing tables must not take the board down.
       */
      (async () => {
        try {
          const { data } = await createAdminClient()
            .from("ranking_drafts")
            .select("athlete_id, rank")
            .eq("class_year", Number(year))
            .eq("gender", gender)
          return new Map((data ?? []).map((row) => [String(row.athlete_id), Number(row.rank)]))
        } catch {
          return new Map<string, number>()
        }
      })(),
    ])
    return NextResponse.json({
      athletes: athletes.map((athlete) => ({
        ...athlete,
        draft_rank: draftRanks.get(String(athlete.id)) ?? null,
      })),
      meta: {
        draft_count: draftRanks.size,
        /** Athletes in this class the query could not place, and why. */
        excluded_no_gender: excluded,
        year,
        gender,
        count: athletes.length,
        scored_at: new Date().toISOString(),
        draft_saved_at: edition?.draft_saved_at ?? null,
        published_at: edition?.published_at ?? null,
        formula: "recruitnc-toc-resume-v2",
      },
    })
  } catch (error) {
    console.error("[rankings-board] GET failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build ranking board" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rankings = Array.isArray(body.rankings) ? body.rankings : []
    const gender = String(body.gender || "Male")
    const year = Number(body.year)
    if (!rankings.length) {
      return NextResponse.json({ error: "No rankings provided" }, { status: 400 })
    }
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "A valid graduation year is required" }, { status: 400 })
    }

    const db = createAdminClient()
    const publicCap = getPublicRankingsMax(year)
    const updates = await Promise.all(
      rankings.map((row: { id?: string; final_rank?: number; previous_ranking?: number | null }) => {
        const id = String(row.id || "")
        const finalRank = Number(row.final_rank)
        if (!id || !Number.isFinite(finalRank) || finalRank < 1) {
          return Promise.resolve({ id, error: { message: "Invalid ranking row" } })
        }
        return db
          .from("athletes")
          .update({
            // The formula privately orders the entire pool. Only an explicit
            // admin save publishes the official top 30; everyone below the cut
            // remains visible on this board but has no public ranking.
            prospect_ranking: finalRank <= publicCap ? finalRank : null,
            previous_ranking: row.previous_ranking ?? null,
          })
          .eq("id", id)
          .ilike("gender", gender)
          .eq("graduationyear", year)
          .select("id,name,prospect_ranking")
          .single()
      }),
    )

    const failed = updates.filter((result) => "error" in result && result.error)
    if (failed.length) {
      return NextResponse.json({ error: "Some rankings failed to save", failed }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      published: Math.min(publicCap, updates.length),
      cleared: Math.max(0, updates.length - publicCap),
      publicCap,
    })
  } catch (error) {
    console.error("[rankings-board] POST failed", error)
    return NextResponse.json({ error: "Failed to save rankings" }, { status: 500 })
  }
}
