import { NextResponse } from "next/server"

import { getAllNews } from "@/lib/news"

/**
 * The newest articles, for the app's home screen.
 *
 * News lives in code (lib/news.ts), so the phone cannot read it from the database; without this
 * the app only had a "United Ascent" row that opened the website, and nobody found the
 * Journeymen recap there. Public: these are the same articles /news shows to anyone.
 */
export async function GET() {
  const site = "https://app.ncwrestlingunited.com"
  const absolute = (path: string | undefined) => (path ? (path.startsWith("http") ? path : `${site}${path}`) : null)
  const items = getAllNews()
    .slice(0, 5)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      category: item.category ?? null,
      date: item.date,
      image: absolute(item.homeImage ?? item.image),
      // Internal articles open at /news/<slug>; a few entries link elsewhere on the site.
      path: item.isAnnouncement ? `/news/${item.slug}` : item.href.startsWith("/") ? item.href : null,
      url: item.isAnnouncement ? `${site}/news/${item.slug}` : absolute(item.href),
    }))
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } })
}
