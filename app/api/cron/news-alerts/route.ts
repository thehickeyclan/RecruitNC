import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendToSubscribers } from "@/lib/push-send"
import { getAllNews } from "@/lib/news"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Never announce an article older than this. A backfill, a corrected date, or a re-ordered
 * registry would otherwise push every story we have ever written.
 */
const MAX_AGE_DAYS = 7

/** One run should never announce more than this — a bulk import is a bug, not a news day. */
const MAX_PER_RUN = 3

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Announces newly published news articles to devices opted into news alerts.
 *
 * Articles are React components under app/news/content, registered in lib/news.ts — publishing
 * one is a deploy, not a database write, so there is no publish moment to fire from the way
 * TOC releases and rankings publishes have. This reads the registry instead and announces what
 * it has not announced before.
 *
 * push_sent_news is the guard: a slug is announced once, ever. A date window alone would
 * re-send every run, and a "since last run" window would drop everything whenever a run failed.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  const recent = getAllNews().filter((item) => item.slug && item.date && item.date >= cutoffIso)

  const { data: alreadySent, error: sentError } = await admin.from("push_sent_news").select("slug")
  if (sentError) {
    console.error("[news-alerts] cannot read push_sent_news:", sentError.message)
    return NextResponse.json({ error: "push_sent_news is not configured." }, { status: 503 })
  }

  const sentSlugs = new Set((alreadySent ?? []).map((r) => r.slug))
  const pending = recent
    .filter((item) => !sentSlugs.has(item.slug))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_PER_RUN)

  if (pending.length === 0) {
    return NextResponse.json({ announced: 0, message: "No new articles to announce." })
  }

  const results: Array<Record<string, unknown>> = []

  for (const item of pending) {
    // Claim before sending. If the send throws, the row stays claimed and this article is not
    // retried forever — a missed notification beats notifying the same story every hour.
    const { error: claimError } = await admin.from("push_sent_news").insert({ slug: item.slug })
    if (claimError) {
      // A duplicate key means another run claimed it first; anything else is worth knowing.
      if (!/duplicate key/i.test(claimError.message)) {
        console.error(`[news-alerts] claim failed for ${item.slug}:`, claimError.message)
      }
      continue
    }

    const outcome = await sendToSubscribers("alert_news", {
      title: item.category?.trim() || "RecruitNC",
      body: item.title,
      data: { kind: "news", slug: item.slug, path: `/news/${item.slug}` },
    })

    console.info(
      `[news-alerts] ${item.slug}: sent ${outcome.sent}, failed ${outcome.failed}, undelivered ${outcome.undelivered}`,
    )
    results.push({ slug: item.slug, title: item.title, ...outcome })
  }

  return NextResponse.json({ announced: results.length, results })
}
