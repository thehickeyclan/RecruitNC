import { LEARN_PAGES } from "@/lib/recruiting/learn/content"
import { RW_STORIES } from "@/lib/recruitwrestlers-news"

/**
 * recruitwrestlers.com's sitemap, served at /sitemap.xml by the middleware (Matt, 30 Oct 2026:
 * public launch). The public pages, the published news and the recruiting guides. Wrestlers'
 * profiles are left out on purpose: they are minors, and families find them through the site.
 */
const ORIGIN = "https://www.recruitwrestlers.com"

const PAGES: Array<[string, number]> = [
  ["/", 1],
  ["/rankings", 0.9],
  ["/command-center", 0.9],
  ["/for-coaches", 0.9],
  ["/membership", 0.8],
  ["/prospects/all", 0.8],
  ["/college-commitments", 0.8],
  ["/recaps", 0.8],
  ["/create-profile", 0.7],
  ["/recruiting/college-map", 0.7],
  ["/recruiting/learn", 0.7],
  ["/recruiting/learn/timeline", 0.6],
  ["/recruiting/learn/tournaments", 0.6],
  ["/recruiting/learn/working-the-process", 0.6],
  ["/recruiting/learn/what-coaches-look-for", 0.6],
  ["/recruiting/learn/womens-wrestling", 0.6],
  ["/recruiting/learn/nil", 0.6],
  ["/recruiting/learn/transfer-portal", 0.6],
  ["/recruiting/learn/eligibility-clock", 0.5],
  ["/about", 0.5],
  ["/contact", 0.4],
  ["/privacy", 0.3],
]

export function GET() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    ...PAGES.map(([path, priority]) => ({ loc: path, priority, lastmod: today })),
    ...RW_STORIES.filter((s) => s.published).map((s) => ({ loc: s.href, priority: 0.7, lastmod: s.date })),
    ...LEARN_PAGES.map((p) => ({ loc: `/recruiting/learn/${p.slug}`, priority: 0.5, lastmod: today })),
  ]
  const seen = new Set<string>()
  const body = urls
    .filter((u) => (seen.has(u.loc) ? false : (seen.add(u.loc), true)))
    .map((u) => `  <url><loc>${ORIGIN}${u.loc === "/" ? "" : u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`)
    .join("\n")
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=3600" },
  })
}
