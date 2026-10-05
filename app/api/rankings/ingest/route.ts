import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { NATIONAL_RANKING_SOURCES, type NationalRankingSource } from "@/lib/national-rankings"
import { importNationalEdition, markRankingChecked, type IncomingRankingRow } from "@/lib/rankings/national-import"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * Drop-off for national ranking editions found outside this app - Muse checks Flo, SI and
 * MatScouts (boys and girls) every morning and posts here.
 *
 * Deliberately not the Supabase service key: this token can submit a rankings list and nothing
 * else, so a leak costs one bad list, rotated in a minute (RANKINGS_INGEST_SECRET on Vercel).
 *
 *   POST /api/rankings/ingest
 *   Authorization: Bearer <RANKINGS_INGEST_SECRET>
 *   { source: "flowrestling" | "sports_illustrated" | "matscouts", gender: "M" | "F",
 *     published: "2026-10-01", url?, scope?: "weight" | "p4p",
 *     rows: [{ rank, name, weight, school, state, grade }] }
 *   or, for a check that found nothing new: { source, gender, unchanged: true }
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.RANKINGS_INGEST_SECRET?.trim()
  if (!secret) return false
  // "Authorization: Bearer <key>" or "x-api-key: <key>" - whichever the sending tool supports.
  const given = (request.headers.get("x-api-key") ?? request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

const MAX_ROWS = 3000
const MIN_ROWS = 20

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }

  const source = String(body.source ?? "") as NationalRankingSource
  if (!(source in NATIONAL_RANKING_SOURCES)) {
    return NextResponse.json({ error: `source must be one of ${Object.keys(NATIONAL_RANKING_SOURCES).join(", ")}` }, { status: 400 })
  }
  const gender = body.gender === "F" ? "F" : body.gender === "M" ? "M" : null
  if (!gender) return NextResponse.json({ error: 'gender must be "M" or "F"' }, { status: 400 })

  const admin = createAdminClient()

  /*
   * SI is read straight from si.com by our own cron (/api/cron/si-rankings). Two writers for one
   * source flip-flopped: Muse's and the cron's parses differed by a few rows, so each replaced the
   * other twice a day. Accepted and ignored, so Muse's run does not fail.
   */
  if (source === "sports_illustrated") {
    return NextResponse.json({ status: "skipped", reason: "SI is loaded directly from si.com by the site; no need to send it." })
  }

  if (body.unchanged === true) {
    await markRankingChecked(admin, source, gender, "muse")
    return NextResponse.json({ status: "checked", source, gender })
  }

  const published = String(body.published ?? "")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) return NextResponse.json({ error: "published must be YYYY-MM-DD" }, { status: 400 })
  const scope = body.scope === "p4p" ? "p4p" : body.scope === "big_board" ? "big_board" : "weight"
  const rows = Array.isArray(body.rows) ? (body.rows as IncomingRankingRow[]) : []
  if (rows.length < MIN_ROWS || rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `rows must hold ${MIN_ROWS}-${MAX_ROWS} entries (got ${rows.length})` }, { status: 400 })
  }
  const bad = rows.findIndex((r) => !r || typeof r.name !== "string" || !r.name.trim() || !(Number(r.rank) > 0))
  if (bad >= 0) return NextResponse.json({ error: `row ${bad} needs a name and a positive rank` }, { status: 400 })
  if (scope === "weight" && rows.some((r) => !r.weight)) {
    return NextResponse.json({ error: "every weight-scope row needs a weight" }, { status: 400 })
  }

  try {
    const result = await importNationalEdition(admin, {
      source,
      gender,
      published,
      url: typeof body.url === "string" ? body.url : null,
      scope,
      rows,
      checkedBy: "muse",
    })
    console.info("[rankings-ingest]", JSON.stringify({ ...result, ncMatched: result.ncMatched.length }))
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[rankings-ingest] failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
