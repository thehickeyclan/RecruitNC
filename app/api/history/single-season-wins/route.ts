import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase anon config missing")
  return createClient(url.replace(/\/+$/, ""), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Public read of single-season wins leaderboard (RLS select). */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const athlete = sp.get("athlete")?.trim() || ""
    const school = sp.get("school")?.trim() || ""
    const season = sp.get("season")?.trim() || ""
    const minWinsRaw = Number(sp.get("min_wins") ?? "")
    const minWins = Number.isFinite(minWinsRaw) && minWinsRaw > 0 ? Math.floor(minWinsRaw) : null
    const sort = sp.get("sort") === "rank" ? "rank" : "wins"
    const limit = Math.min(Math.max(Number(sp.get("limit") ?? "521"), 1), 521)

    const supabase = anonClient()

    let query = supabase
      .from("winningest_wrestlers")
      .select(
        "id, rank_position, rank_numeric, is_tied, wrestler_name, school, record, wins, losses, year, athlete_id, match_status",
      )
      .limit(limit)

    if (sort === "rank") {
      query = query.order("rank_numeric", { ascending: true }).order("wins", { ascending: false })
    } else {
      query = query.order("wins", { ascending: false }).order("rank_numeric", { ascending: true })
    }

    if (athlete.length >= 2) query = query.ilike("wrestler_name", `%${athlete}%`)
    if (school.length >= 2) query = query.ilike("school", `%${school}%`)
    if (season) query = query.eq("year", season)
    if (minWins != null) query = query.gte("wins", minWins)

    const { data, error } = await query
    if (error) {
      console.error("[RecruitNC] single-season-wins GET", error.message)
      return NextResponse.json({ error: error.message, rows: [], count: 0 }, { status: 500 })
    }

    const { data: sources } = await supabase
      .from("historical_record_sources")
      .select("title, dataset_key, version")
      .eq("dataset_key", "nc_wrestling_most_victories_single_season")
      .order("version", { ascending: false })
      .limit(1)

    return NextResponse.json({
      rows: data ?? [],
      count: data?.length ?? 0,
      source: sources?.[0] ?? null,
    })
  } catch (e) {
    console.error("[RecruitNC] single-season-wins", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error", rows: [], count: 0 },
      { status: 500 },
    )
  }
}
