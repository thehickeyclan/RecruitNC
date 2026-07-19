import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  buildRankWrestlerSeasonPayload,
  visibleTextFromRankWrestlerHtml,
} from "@/lib/match-manager/rankwrestler-parser"

function isAllowedRankWrestlerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol) && /(^|\.)rankwrestler\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}

async function fetchRankWrestlerText(url: string): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const cookie = process.env.RANKWRESTLER_COOKIE?.trim()
  if (!cookie) {
    return {
      ok: false,
      status: 412,
      error:
        "RankWrestler sync is not configured yet. Add RANKWRESTLER_COOKIE as a server environment variable, then retry this sync.",
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      cookie,
      "user-agent": "RecruitNC Match Manager Sync/1.0",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  })

  const body = await response.text()
  if (!response.ok) {
    return { ok: false, status: response.status, error: `RankWrestler returned HTTP ${response.status}.` }
  }

  return { ok: true, text: visibleTextFromRankWrestlerHtml(body) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const athleteId = String(body.athleteId ?? "").trim()
    const rankwrestlerUrl = String(body.rankwrestlerUrl ?? "").trim()
    const deduplicate = body.deduplicate !== false

    if (!athleteId) {
      return NextResponse.json({ success: false, error: "Missing athleteId." }, { status: 400 })
    }
    if (!rankwrestlerUrl || !isAllowedRankWrestlerUrl(rankwrestlerUrl)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid RankWrestler athlete/season URL." },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, high_school")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ success: false, error: "Athlete not found." }, { status: 404 })
    }

    const fetched = await fetchRankWrestlerText(rankwrestlerUrl)
    if (!fetched.ok) {
      return NextResponse.json({ success: false, error: fetched.error }, { status: fetched.status })
    }

    const parsed = buildRankWrestlerSeasonPayload({
      athleteName: athlete.name,
      graduationYear: athlete.graduationyear,
      highSchool: athlete.high_school,
      rawText: fetched.text,
      format: "rank",
      deduplicate,
    })

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 422 })
    }

    const payload = parsed.payload
    const wrestlerId = `${athlete.name.toLowerCase().replace(/\s+/g, "_")}_${payload.wrestler_info.season}`

    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("season", payload.wrestler_info.season)

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    const matchRecord = {
      athlete_id: athleteId,
      wrestler_id: wrestlerId,
      first_name: payload.wrestler_info.first_name,
      last_name: payload.wrestler_info.last_name,
      season: payload.wrestler_info.season,
      grade: payload.wrestler_info.grade,
      high_school: payload.wrestler_info.high_school,
      total_matches: payload.season_summary.total_matches,
      wins: payload.season_summary.wins,
      losses: payload.season_summary.losses,
      pins: payload.season_summary.pins,
      tech_falls: payload.season_summary.tech_falls,
      decisions: payload.season_summary.decisions,
      major_decisions: payload.season_summary.major_decisions,
      forfeits_won: payload.season_summary.forfeits_won,
      pin_percentage: payload.season_summary.pin_percentage,
      tf_percentage: payload.season_summary.tf_percentage,
      finishing_percentage: payload.season_summary.finishing_percentage,
      matches: payload.matches,
      source: "rankwrestler_sync",
      source_url: rankwrestlerUrl,
      updated_at: new Date().toISOString(),
    }

    let insertPayload: Record<string, unknown> = matchRecord
    let { data: insertedMatch, error: insertError } = await supabase.from("matches").insert(insertPayload).select().single()

    if (insertError && /source|source_url|updated_at/i.test(insertError.message ?? "")) {
      const fallbackPayload = { ...insertPayload }
      delete fallbackPayload.source
      delete fallbackPayload.source_url
      delete fallbackPayload.updated_at
      ;({ data: insertedMatch, error: insertError } = await supabase.from("matches").insert(fallbackPayload).select().single())
    }

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${payload.season_summary.total_matches} matches for ${athlete.name}.`,
      athleteName: athlete.name,
      matchId: insertedMatch?.id,
      wrestlerId,
      season: payload.wrestler_info.season,
      grade: payload.wrestler_info.grade,
      diagnostics: parsed.diagnostics,
    })
  } catch (error) {
    console.error("[rankwrestler-sync] unexpected error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "RankWrestler sync failed." },
      { status: 500 },
    )
  }
}
