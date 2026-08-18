import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import { buildRecruitNcRankingBoard } from "@/lib/rankings/recruitnc-ranking-engine"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2027"
    const gender = searchParams.get("gender") || "Male"
    const db = createAdminClient()
    const athletes = await buildRecruitNcRankingBoard({ supabase: db, year, gender })
    return NextResponse.json({
      athletes,
      meta: {
        year,
        gender,
        count: athletes.length,
        scored_at: new Date().toISOString(),
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
