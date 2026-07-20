import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  buildRankWrestlerSeasonPayload,
  rankWrestlerTextCandidatesFromHtml,
  visibleTextFromRankWrestlerHtml,
} from "@/lib/match-manager/rankwrestler-parser"
import { renderRankWrestlerProfileText } from "@/lib/match-manager/rankwrestler-rendered-browser"

export const runtime = "nodejs"
export const maxDuration = 90

function isAllowedRankWrestlerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol) && /(^|\.)rankwrestlers?\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}

type RankWrestlerFetchDiagnostics = {
  url: string
  textLength: number
  htmlLength: number
  title?: string
  looksLikeLogin: boolean
  looksLikeClientAppShell: boolean
  hasMatchWords: boolean
  textCandidateCount: number
  textCandidateSources: string[]
  preview: string
}

function buildFetchDiagnostics(
  url: string,
  html: string,
  text: string,
  candidates: Array<{ source: string; text: string }>,
): RankWrestlerFetchDiagnostics {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim()
  const lowerText = text.toLowerCase()
  const lowerHtml = html.toLowerCase()
  return {
    url,
    textLength: text.length,
    htmlLength: html.length,
    title,
    looksLikeLogin: /sign in|log in|login|password|auth/i.test(text),
    looksLikeClientAppShell:
      lowerHtml.includes("__next_data__") ||
      lowerHtml.includes("id=\"root\"") ||
      lowerHtml.includes("id=\"__next\"") ||
      (text.length < 500 && lowerHtml.includes("<script")),
    hasMatchWords: /win|loss|opponent|weight|matches|season|fall|decision|tech/i.test(lowerText),
    textCandidateCount: candidates.length,
    textCandidateSources: candidates.map((candidate) => candidate.source),
    preview: text.replace(/\s+/g, " ").trim().slice(0, 1200),
  }
}

function buildRenderedDiagnostics(
  rankwrestlerUrl: string,
  rendered: Extract<Awaited<ReturnType<typeof renderRankWrestlerProfileText>>, { ok: true }>,
): Record<string, unknown> {
  return {
    url: rankwrestlerUrl,
    finalUrl: rendered.finalUrl,
    title: rendered.title,
    textLength: rendered.text.length,
    htmlLength: rendered.htmlLength,
    usedCookie: rendered.usedCookie,
    usedLogin: rendered.usedLogin,
    matchHistoryFound: rendered.matchHistoryFound,
    preview: rendered.text.replace(/\s+/g, " ").trim().slice(0, 1200),
    textCandidateCount: 1,
    textCandidateSources: ["rendered_browser"],
  }
}

async function fetchRankWrestlerText(
  url: string,
): Promise<
  | { ok: true; textCandidates: Array<{ source: string; text: string }>; diagnostics: RankWrestlerFetchDiagnostics }
  | { ok: false; status: number; error: string; diagnostics?: RankWrestlerFetchDiagnostics }
> {
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
  const text = visibleTextFromRankWrestlerHtml(body)
  const textCandidates = rankWrestlerTextCandidatesFromHtml(body)
  const diagnostics = buildFetchDiagnostics(url, body, text, textCandidates)
  if (!response.ok) {
    return { ok: false, status: response.status, error: `RankWrestler returned HTTP ${response.status}.`, diagnostics }
  }

  return { ok: true, textCandidates, diagnostics }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const athleteId = String(body.athleteId ?? "").trim()
    const rankwrestlerUrl = String(body.rankwrestlerUrl ?? "").trim()
    const deduplicate = body.deduplicate !== false
    const renderedBrowser = body.renderedBrowser === true

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
      .select("id, name, graduationyear, highschool")
      .eq("id", athleteId)
      .single()

    if (athleteError) {
      console.error("[rankwrestler-sync] athlete lookup failed", athleteError)
      return NextResponse.json(
        { success: false, error: `Athlete lookup failed: ${athleteError.message}` },
        { status: 500 },
      )
    }

    if (!athlete) {
      return NextResponse.json({ success: false, error: "Athlete not found." }, { status: 404 })
    }

    let textCandidates: Array<{ source: string; text: string }> = []
    let fetchDiagnostics: RankWrestlerFetchDiagnostics | null = null
    let renderedDiagnostics: Record<string, unknown> | null = null
    let usedRenderedBrowser = renderedBrowser

    if (renderedBrowser) {
      const rendered = await renderRankWrestlerProfileText(rankwrestlerUrl)
      if (!rendered.ok) {
        return NextResponse.json(
          { success: false, error: rendered.error, hint: rendered.hint, diagnostics: rendered.diagnostics },
          { status: rendered.status },
        )
      }
      textCandidates = [{ source: "rendered_browser", text: rendered.text }]
      renderedDiagnostics = buildRenderedDiagnostics(rankwrestlerUrl, rendered)
    } else {
      const fetched = await fetchRankWrestlerText(rankwrestlerUrl)
      if (!fetched.ok) {
        return NextResponse.json({ success: false, error: fetched.error, diagnostics: fetched.diagnostics }, { status: fetched.status })
      }
      textCandidates = fetched.textCandidates
      fetchDiagnostics = fetched.diagnostics
    }

    let parsed = null as ReturnType<typeof buildRankWrestlerSeasonPayload> | null
    let parsedSource = ""
    for (const candidate of textCandidates) {
      const candidateParse = buildRankWrestlerSeasonPayload({
        athleteName: athlete.name,
        graduationYear: athlete.graduationyear,
        highSchool: athlete.highschool,
        rawText: candidate.text,
        format: "rank",
        deduplicate,
      })
      if (candidateParse.success) {
        parsed = candidateParse
        parsedSource = candidate.source
        break
      }
      parsed = candidateParse
    }

    if (!parsed?.success && !renderedBrowser && fetchDiagnostics?.looksLikeClientAppShell) {
      const rendered = await renderRankWrestlerProfileText(rankwrestlerUrl)
      if (rendered.ok) {
        const renderedParse = buildRankWrestlerSeasonPayload({
          athleteName: athlete.name,
          graduationYear: athlete.graduationyear,
          highSchool: athlete.highschool,
          rawText: rendered.text,
          format: "rank",
          deduplicate,
        })
        parsed = renderedParse
        if (renderedParse.success) {
          parsedSource = "rendered_browser"
          usedRenderedBrowser = true
          renderedDiagnostics = buildRenderedDiagnostics(rankwrestlerUrl, rendered)
        }
      } else {
        renderedDiagnostics = {
          ...(fetchDiagnostics ?? {}),
          renderedBrowserError: rendered.error,
          renderedBrowserHint: rendered.hint,
        }
      }
    }

    if (!parsed?.success) {
      const parseError =
        parsed && !parsed.success ? parsed.error : "No usable text was found in the RankWrestler source."
      const hint = usedRenderedBrowser
        ? "RankWrestler rendered in the browser, but RecruitNC could not parse the Match History text. Copy the visible Match History into Raw Text Parser and send me the failed snippet so I can teach the parser that layout."
        : renderedDiagnostics?.renderedBrowserError
        ? `RankWrestler returned the app shell, then browser automation also failed: ${renderedDiagnostics.renderedBrowserError}`
        : fetchDiagnostics?.looksLikeLogin
        ? "RankWrestler appears to be returning a login page. The auth token may be expired or the cookie value is incomplete."
        : fetchDiagnostics?.looksLikeClientAppShell
          ? fetchDiagnostics.textCandidateCount > 1
            ? "RankWrestler returned a client-side app shell. Browser automation fallback should run automatically; if it did not, confirm the deployed build includes the latest commit and send the diagnostics."
            : "RankWrestler appears to be returning a client-side app shell. The match rows may load from a separate API request."
          : "The fetched page did not match the current Rank/Track parser format."
      return NextResponse.json(
        { success: false, error: parseError, hint, diagnostics: renderedDiagnostics ?? fetchDiagnostics },
        { status: 422 },
      )
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
      source: usedRenderedBrowser ? "rankwrestler_rendered_browser_sync" : "rankwrestler_sync",
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
      diagnostics: {
        ...parsed.diagnostics,
        ...(renderedDiagnostics ?? {}),
      },
      parsedSource,
      renderedBrowser: usedRenderedBrowser,
    })
  } catch (error) {
    console.error("[rankwrestler-sync] unexpected error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "RankWrestler sync failed." },
      { status: 500 },
    )
  }
}
