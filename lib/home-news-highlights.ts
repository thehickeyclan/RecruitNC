/**
 * News highlights for the home page carousel.
 * First item = main/featured story; rest = secondary. Links go to actual article pages.
 *
 * Part 1 (seven-divisions) uses the bulletproof route so the article always loads:
 * /article/seven-divisions-98-brackets-784-qualifiers (plain HTML, no React; see docs/ARTICLE-BULLETPROOF-ROUTE.md).
 */
export interface HomeNewsItem {
  id: string
  title: string
  summary: string
  href: string
  image?: string
  /** Use "top" so people/faces stay visible when image is cropped (object-position: top) */
  imagePosition?: "top" | "center"
  category?: string
  categoryBadgeClass?: string
  readTime?: string
  date?: string
}

const NCHSAA_YEAR = "2026"

/** Only the 3 State Championship Series articles (Part 1, Part 2, Part 3). */
export const HOME_NEWS_HIGHLIGHTS: HomeNewsItem[] = [
  {
    id: "seven-divisions",
    title: "Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?",
    summary: "When Structure Shapes Value — Part I: Diagnosis. A two-part conversation about North Carolina's classification system.",
    href: `/article/seven-divisions-98-brackets-784-qualifiers`,
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
    imagePosition: "top",
    category: "DATA & RANKINGS",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "10 min read",
    date: "2026-02-25",
  },
  {
    id: "three-join-the-immortals",
    title: "Three Join the Immortals: North Carolina's Historic 2026 Four-Time State Champions",
    summary: "For the first time in nearly four decades, three four-time state champions were crowned in a single year — Cael Dunn, Lorenzo Alston, and Bentley Sly.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/three-join-the-immortals-2026`,
    image: "/images/nchsaa-2026-four-time-champions.png",
    imagePosition: "top",
    category: "CELEBRATION",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "14 min read",
    date: "2026-02-26",
  },
]
