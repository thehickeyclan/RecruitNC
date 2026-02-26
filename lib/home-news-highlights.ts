/**
 * News highlights for the home page carousel.
 * First item = main/featured story; rest = secondary. Links go to actual article pages.
 */
export interface HomeNewsItem {
  id: string
  title: string
  summary: string
  href: string
  image?: string
  category?: string
  categoryBadgeClass?: string
  readTime?: string
  date?: string
}

const NCHSAA_YEAR = "2026"

export const HOME_NEWS_HIGHLIGHTS: HomeNewsItem[] = [
  {
    id: "seven-divisions",
    title: "Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?",
    summary: "When Structure Shapes Value — Part I: Diagnosis. A two-part conversation about North Carolina's classification system.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/seven-divisions-98-brackets-784-qualifiers`,
    image: "/images/nchsaa-2026-seven-divisions.png",
    category: "ANALYSIS",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "12 min read",
    date: "2026-02-25",
  },
  {
    id: "bracket-depth",
    title: "Bracket Depth by the Numbers: What 98 Brackets Reveal",
    summary: "How bracket strength is measured and where ranked talent concentrated.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/article-2`,
    image: "/images/nchsaa-2026-7a-138-podium.png",
    category: "DATA & RANKINGS",
    categoryBadgeClass: "bg-amber-600",
    readTime: "10 min read",
    date: "2026-02-25",
  },
  {
    id: "article-3",
    title: "Not All Brackets Were Equal: Celebrating the ELITE Bracket Warriors",
    summary: "Only 2 brackets qualified as ELITE. Celebrating the wrestlers who chose the hard path.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/article-3`,
    category: "CELEBRATION",
    categoryBadgeClass: "bg-red-600",
    readTime: "8 min read",
    date: "2026-02-25",
  },
  {
    id: "article-4",
    title: "2026 State Championship Highlights",
    summary: "98 state champions and 392 medalists. Standout performances and storylines from the tournament.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/article-4`,
    category: "HIGHLIGHTS",
    categoryBadgeClass: "bg-green-600",
    readTime: "6 min read",
    date: "2026-02-25",
  },
]
