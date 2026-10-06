import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { NATIONAL_RANKING_SOURCES } from "@/lib/national-rankings"
import { freshnessProblem, listLabel, type WatchedList } from "@/lib/rankings/freshness"

export const dynamic = "force-dynamic"

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

/**
 * Daily: are the national rankings current? Rankings went a month stale in October 2026 and a
 * wrestler noticed before we did. This reads ranking_source_status (stamped by the SI cron and
 * by Muse's posts to /api/rankings/ingest) and emails RANKINGS_ALERT_TO only when something is off.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.from("ranking_source_status").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date()
  const problems: string[] = []
  const report: Array<Record<string, unknown>> = []
  /*
   * Watch the lists an outlet actually publishes, not every (source, gender) we can imagine. A
   * source that has never sent a girls list should not be reported stale forever, while a source
   * that publishes several needs each one watched: MatScouts' girls board is their only girls
   * list, and they publish a separate board per recruiting class, each on its own clock.
   *
   * The status rows ARE that set, one per list, so they drive the loop. A source with no row at
   * all is the one case they cannot speak for - nobody has ever checked it - so it is seeded.
   */
  const watched = new Map<string, WatchedList>()
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    const list: WatchedList = {
      source: String(r.source ?? ""),
      gender: String(r.gender ?? ""),
      scope: String(r.scope ?? "weight"),
      editionClassYear: Number(r.edition_class_year ?? 0),
      lastCheckedAt: (r.last_checked_at as string) ?? null,
      lastChangedAt: (r.last_changed_at as string) ?? null,
      published: (r.published as string) ?? null,
      priorSeasonPublished: (r.prior_season_published as string) ?? null,
    }
    watched.set(`${list.source}|${list.gender}|${list.scope}|${list.editionClassYear}`, list)
  }
  for (const source of Object.keys(NATIONAL_RANKING_SOURCES)) {
    if ((data ?? []).some((r) => String((r as Record<string, unknown>).source) === source)) continue
    for (const gender of ["M", "F"]) {
      watched.set(`${source}|${gender}|weight|0`, { source, gender, scope: "weight", editionClassYear: 0 })
    }
  }

  for (const [, list] of [...watched].sort(([a], [b]) => a.localeCompare(b))) {
    const problem = freshnessProblem(list, now)
    report.push({
      list: listLabel(list),
      source: list.source,
      gender: list.gender,
      scope: list.scope,
      classYear: list.editionClassYear,
      published: list.published ?? null,
      priorSeasonPublished: list.priorSeasonPublished ?? null,
      problem,
    })
    if (problem) problems.push(problem)
  }

  const to = (process.env.RANKINGS_ALERT_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  if (problems.length && to.length && process.env.RESEND_API_KEY) {
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: FROM,
        to,
        subject: `Rankings check: ${problems.length} source${problems.length === 1 ? "" : "s"} need a look`,
        text: [
          "The daily national rankings check found:",
          "",
          ...problems.map((p) => `- ${p}`),
          "",
          "SI is fetched automatically twice a day. Flo and MatScouts come from Muse's daily check",
          "(POST /api/rankings/ingest). Profiles show only what has been loaded.",
        ].join("\n"),
      })
    } catch (e) {
      console.error("[rankings-freshness] email failed", e)
    }
  }
  console.info("[rankings-freshness]", JSON.stringify({ problems }))
  return NextResponse.json({ problems, report })
}
