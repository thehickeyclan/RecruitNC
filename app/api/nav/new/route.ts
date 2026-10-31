import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { reportsOnAddress, resolveCoachReportViewer } from "@/lib/coach-reports"
import { liveStates, RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { getAllNews } from "@/lib/news"
import { RW_STORIES } from "@/lib/recruitwrestlers-news"
import { RELEASE_WINDOW_DAYS, type NavNewFeed, type NavRelease } from "@/lib/nav-new"
import { inState } from "@/lib/recruiting/states"

export const dynamic = "force-dynamic"

/**
 * GET /api/nav/new - what the menu may mark as new on this address (lib/nav-new.ts): the coach's
 * reports, the latest rankings release and the newest story. The browser decides what is unseen.
 * `events` lists each of them from the last few weeks for the bell, one line per release.
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
      ? reportsOnAddress(onRw).filter((d) => viewer.genders.includes(d.gender))
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

  const stories = (onRw ? RW_STORIES.filter((s) => s.published) : getAllNews().filter((n) => n.href.startsWith("/")))
    .map((s) => ({ title: s.title, href: s.href, date: s.date }))
    .filter((s) => s.date <= today)
  const newsDate = stories.map((s) => s.date).sort().pop() ?? null

  const stateName = (code: string) => RECRUITING_BRAND.states.find((s) => s.code === code)?.name ?? code
  const cutoff = new Date(Date.now() - RELEASE_WINDOW_DAYS * 86_400_000).toISOString()

  /*
   * Commitments in the bell too (Matt, 30 Oct 2026: "commitments should also go to the bell alerts...
   * on both platforms"): this address's states, newest first, by when we learned of each
   * (college_set_at, which an edit to a photo or a weight never moves).
   */
  const commitRows = (
    await Promise.all(
      states.map((code) =>
        inState(
          admin.from("athletes").select("id, name, highschool, college, college_set_at").not("college", "is", null).neq("college", "").gte("college_set_at", cutoff),
          code,
        )
          .order("college_set_at", { ascending: false })
          .limit(15)
          .then((r) => (r.data ?? []) as Array<{ id: string; name: string | null; highschool: string | null; college: string; college_set_at: string }>),
      ),
    ).catch(() => [] as Array<Array<{ id: string; name: string | null; highschool: string | null; college: string; college_set_at: string }>>)
  ).flat()
  const events: NavRelease[] = [
    ...released.map((e) => {
      const women = /^f/i.test(String(e.gender))
      return {
        id: `rankings:${e.state}:${e.class_year}:${e.gender}:${e.published_at}`,
        kind: "rankings" as const,
        title: `${stateName(String(e.state))} Class of ${e.class_year} ${women ? "women's" : "men's"} rankings published`,
        link: `/public-rankings/${women ? "women/" : ""}${e.class_year}?state=${e.state}`,
        at: String(e.published_at),
      }
    }),
    ...reports.map((d) => ({ id: `report:${d.slug}`, kind: "report" as const, title: `${d.title} is ready`, link: `/coach-reports/${d.slug}`, at: d.date, slug: d.slug })),
    ...stories.map((s) => ({ id: `news:${s.href}`, kind: "news" as const, title: s.title, link: s.href, at: s.date })),
    ...commitRows.map((a) => ({
      id: `commit:${a.id}:${a.college}`,
      kind: "commitment" as const,
      title: `${String(a.name ?? "A wrestler").trim()}${a.highschool ? ` (${a.highschool})` : ""} committed to ${a.college}`,
      link: `/view-profile?id=${a.id}`,
      at: String(a.college_set_at),
    })),
  ]
    .filter((e) => (e.at.length === 10 ? `${e.at}T12:00:00Z` : e.at) >= cutoff)
    .sort((a, b) => (b.at > a.at ? 1 : -1))

  const feed: NavNewFeed = { reports: reports.map((d) => ({ slug: d.slug, date: d.date })), rankingsPublishedAt, newsDate, events }
  return NextResponse.json(feed)
}
