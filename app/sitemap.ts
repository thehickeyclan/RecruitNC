import type { MetadataRoute } from "next"

import { LEARN_PAGES } from "@/lib/recruiting/learn/content"

/**
 * NC United's sitemap, at app.ncwrestlingunited.com/sitemap.xml (Matt, 30 Oct 2026: Search Console).
 * Its public pages and the recruiting guides; wrestlers' profiles are left out on purpose (they are
 * minors). recruitwrestlers.com is served its own by the middleware (app/recruitwrestlers/sitemap.xml).
 * It used to list three pages, one of them the archived Spartan race.
 */
const BASE = "https://app.ncwrestlingunited.com"

const PAGES: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
  ["", 1, "daily"],
  ["/news", 0.9, "daily"],
  ["/rankings", 0.9, "weekly"],
  ["/college-commitments", 0.9, "daily"],
  ["/colleges", 0.7, "weekly"],
  ["/high-schools", 0.7, "weekly"],
  ["/prospects/all", 0.8, "weekly"],
  ["/tournament-of-champions", 0.8, "weekly"],
  ["/calendar", 0.8, "weekly"],
  ["/clubs", 0.7, "weekly"],
  ["/command-center", 0.8, "weekly"],
  ["/blue", 0.8, "weekly"],
  ["/for-coaches", 0.7, "monthly"],
  ["/national-team", 0.6, "monthly"],
  ["/fundraising", 0.6, "monthly"],
  ["/create-profile", 0.6, "monthly"],
  ["/recruiting/college-map", 0.6, "weekly"],
  ["/recruiting/learn", 0.6, "monthly"],
  ["/recruiting/learn/timeline", 0.5, "monthly"],
  ["/recruiting/learn/tournaments", 0.5, "monthly"],
  ["/recruiting/learn/working-the-process", 0.5, "monthly"],
  ["/recruiting/learn/what-coaches-look-for", 0.5, "monthly"],
  ["/recruiting/learn/womens-wrestling", 0.5, "monthly"],
  ["/recruiting/learn/nil", 0.5, "monthly"],
  ["/about", 0.5, "monthly"],
  ["/privacy", 0.3, "yearly"],
  ["/terms", 0.3, "yearly"],
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    ...PAGES.map(([path, priority, changeFrequency]) => ({ url: `${BASE}${path}`, lastModified: now, changeFrequency, priority })),
    ...LEARN_PAGES.map((p) => ({ url: `${BASE}/recruiting/learn/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 })),
  ]
}
