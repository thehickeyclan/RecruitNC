import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { NATIONAL_RANKING_SOURCES, type NationalRankingSource } from "@/lib/national-rankings"

export const dynamic = "force-dynamic"

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/** Nobody has looked at this source in two days: the daily check has stopped. */
const CHECK_STALE_DAYS = 2
/** No new edition in three weeks: worth a human look, since in season they publish weekly. */
const EDITION_STALE_DAYS = 21

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"
const GENDER = { M: "boys", F: "girls" } as const

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

  const now = Date.now()
  const days = (iso: string | null | undefined) => (iso ? (now - new Date(iso).getTime()) / 86_400_000 : Infinity)
  const problems: string[] = []
  const report: Array<Record<string, unknown>> = []
  for (const source of Object.keys(NATIONAL_RANKING_SOURCES) as NationalRankingSource[]) {
    for (const gender of ["M", "F"] as const) {
      const row = (data ?? []).find((r) => r.source === source && r.gender === gender)
      const label = `${NATIONAL_RANKING_SOURCES[source]} ${GENDER[gender]}`
      const checked = days(row?.last_checked_at)
      const changed = days(row?.last_changed_at)
      report.push({ source, gender, checkedDaysAgo: Math.round(checked * 10) / 10, changedDaysAgo: Math.round(changed * 10) / 10 })
      if (checked > CHECK_STALE_DAYS) {
        problems.push(`${label}: not checked ${Number.isFinite(checked) ? `in ${Math.floor(checked)} days` : "ever"}`)
      } else if (changed > EDITION_STALE_DAYS) {
        problems.push(`${label}: checked daily, but no new edition in ${Math.floor(changed)} days (last published ${row?.published ?? "unknown"})`)
      }
    }
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
