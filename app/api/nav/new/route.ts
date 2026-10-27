import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { reportsOnAddress, resolveCoachReportViewer } from "@/lib/coach-reports"
import { liveStates } from "@/lib/recruiting/brand"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { getAllNews } from "@/lib/news"
import { RW_STORIES } from "@/lib/recruitwrestlers-news"
import type { NavNewFeed } from "@/lib/nav-new"

export const dynamic = "force-dynamic"

/**
 * GET /api/nav/new - what the menu may mark as new on this address (lib/nav-new.ts): the coach's
 * reports, the latest rankings release and the newest story. The browser decides what is unseen.
 */
export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  const today = new Date().toISOString().slice(0, 10)

  const viewer = await resolveCoachReportViewer(admin, user.id)
  const reports =
    viewer.access === "ok"
      ? reportsOnAddress(onRw).filter((d) => viewer.genders.includes(d.gender)).map((d) => ({ slug: d.slug, date: d.date }))
      : []

  // A board counts once it is out: North Carolina's by its release list, every other state's by its edition.
  const states = liveStates(onRw).map((s) => s.code)
  const { data: editions } = await admin
    .from("ranking_editions")
    .select("class_year, gender, state, published_at")
    .in("state", states)
    .not("published_at", "is", null)
  const released = (editions ?? []).filter((e) => e.state !== "NC" || isPublicRankingsYearPublished(e.class_year as number, e.gender))
  const rankingsPublishedAt = released.map((e) => String(e.published_at)).sort().pop() ?? null

  const newsDate =
    (onRw ? RW_STORIES.filter((s) => s.published).map((s) => s.date) : getAllNews().map((n) => n.date))
      .filter((d) => d <= today)
      .sort()
      .pop() ?? null

  const feed: NavNewFeed = { reports, rankingsPublishedAt, newsDate }
  return NextResponse.json(feed)
}
