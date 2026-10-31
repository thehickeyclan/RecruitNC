/**
 * Which FloWrestling commitment lists we read.
 *
 * Flo publishes one running article per recruiting class and never renames the slug, so the
 * article id is a stable handle. What is not stable is which classes have a list: a junior list
 * appears a year before anyone needs it and a senior list closes when the class graduates. So the
 * catalog is a starting point, not the answer - `discoverFloCommitmentLists` looks for the lists
 * Flo is publishing now and merges what it finds, and each entry is checked against the title of
 * the page it actually fetched before a row is believed (see flo-parse: the class year comes from
 * the page, never from this file or from the URL).
 *
 * The women's list is not D1-only and does not name a year: it is the ranked senior class across
 * every division, and its class year resolves against our own July rollover.
 */
import { seniorClassYear } from "@/lib/class-years"
import { FLO_ARTICLE_PAGE } from "@/lib/college-commitments/flo-fetch"

export type FloListSource = {
  articleId: string
  slug: string
  gender: "Male" | "Female"
  /** What we expect the page to be, used to refuse an article that has become something else. */
  expectTitle: RegExp
  sourceUrl: string
}

const entry = (articleId: string, slug: string, gender: "Male" | "Female", expectTitle: RegExp): FloListSource => ({
  articleId,
  slug,
  gender,
  expectTitle,
  sourceUrl: FLO_ARTICLE_PAGE(articleId, slug),
})

export const FLO_COMMITMENT_LISTS: FloListSource[] = [
  entry("12843311", "2026-ncaa-wrestling-d1-commitment-list", "Male", /commitment list/i),
  entry("14428595", "2027-ncaa-wrestling-d1-commitment-list", "Male", /commitment list/i),
  entry("14090489", "ranked-high-school-senior-womens-commitment-list", "Female", /commitment list/i),
]

/**
 * The lists Flo is publishing now, from its own article index.
 *
 * Searching rather than hardcoding is the point: the class of 2028's list will appear under an id
 * nobody here can know, and a job that only ever reads three fixed articles would quietly stop
 * covering the incoming class. Anything found is merged with the catalog above and deduplicated
 * by article id; a failed search is not a failed run, because the catalog still works.
 */
export async function discoverFloCommitmentLists(fetchImpl: typeof fetch = fetch): Promise<FloListSource[]> {
  const found = new Map<string, FloListSource>(FLO_COMMITMENT_LISTS.map((l) => [l.articleId, l]))
  try {
    const response = await fetchImpl("https://www.flowrestling.org/articles?nav_id=125", {
      headers: { accept: "text/html", "user-agent": "RecruitNC/1.0 (+https://www.ncunitedwrestling.com)" },
      cache: "no-store",
    })
    if (!response.ok) return [...found.values()]
    const html = await response.text()
    for (const m of html.matchAll(/\/articles\/(\d+)-([a-z0-9-]*commitment-list)\b/gi)) {
      const [, articleId, slug] = m as unknown as [string, string, string]
      if (found.has(articleId)) continue
      found.set(articleId, entry(articleId, slug, /women|girls/i.test(slug) ? "Female" : "Male", /commitment list/i))
    }
  } catch {
    /* The catalog is the fallback; a search that fails is not a run that fails. */
  }
  return [...found.values()]
}

/**
 * Whether a class is one we still care to read.
 *
 * Flo leaves old lists up. Reading the class of 2024's every week would spend a request to learn
 * nothing and, worse, would keep re-announcing commitments made two years ago. Anything from the
 * current senior class forward is live; everything behind it is history we already hold.
 */
export function isLiveCommitmentClass(classYear: number, now: Date = new Date()): boolean {
  return classYear >= seniorClassYear(now)
}
