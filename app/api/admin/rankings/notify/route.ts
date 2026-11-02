import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { buildRankingsUpdatePush, notifyRankingsUpdate } from "@/lib/rankings-notification"
import { HOME_STATE } from "@/lib/recruiting/states"

export const dynamic = "force-dynamic"

/**
 * The one iPhone alert for a rankings update (Matt, 30 October 2026).
 *
 * Publishing never alerts the phones. This names every North Carolina men's board published in
 * the last two days - the classes and the Top 75 - in a single push, so parents hear about an
 * update once however many boards it touched. GET shows what it would say; POST sends it.
 */
const WINDOW_MS = 48 * 60 * 60 * 1000
/** The events this update brought in, named in the alert. Edit before announcing the next update. */
const UPDATE_EVENTS = ["TOC", "Journeymen", "Super 32"]

async function currentUpdate() {
  const admin = createAdminClient()
  const since = Date.now() - WINDOW_MS
  const [{ data: editions }, { data: top }] = await Promise.all([
    admin.from("ranking_editions").select("class_year, published_at").eq("state", HOME_STATE).eq("gender", "Male").not("published_at", "is", null),
    admin.from("top_100_rankings").select("athlete_id, rank, published_at").eq("gender", "Male").order("rank", { ascending: true }).limit(1),
  ])
  const classes = (editions ?? [])
    .filter((e) => new Date(String(e.published_at)).getTime() >= since && isPublicRankingsYearPublished(Number(e.class_year), "Male"))
    .map((e) => Number(e.class_year))
  const top75 = top?.[0] ? new Date(String(top[0].published_at)).getTime() >= since : false
  let leader: string | null = null
  if (top75 && top?.[0]) {
    const { data } = await admin.from("athletes").select("name").eq("id", top[0].athlete_id).maybeSingle()
    leader = (data?.name as string) ?? null
  }
  return { classes, top75, leader, events: UPDATE_EVENTS }
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const update = await currentUpdate()
  if (!update.classes.length && !update.top75) {
    return NextResponse.json({ error: "Nothing was published in the last two days, so there is no update to announce." }, { status: 400 })
  }
  return NextResponse.json({ ...update, message: buildRankingsUpdatePush(update) })
}

export async function POST() {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const update = await currentUpdate()
  if (!update.classes.length && !update.top75) {
    return NextResponse.json({ error: "Nothing was published in the last two days, so there is no update to announce." }, { status: 400 })
  }
  const push = await notifyRankingsUpdate(update)
  if (!push) return NextResponse.json({ error: "The alert did not send. Check the server log." }, { status: 500 })
  return NextResponse.json({ ok: true, sent: push.sent, failed: push.failed })
}
