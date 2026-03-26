/**
 * Unified news feed: NCHSAA articles, announcements, and updates.
 * Single source of truth for the news index page and home carousel.
 * Newest first; home carousel uses first N items.
 */

const NCHSAA_YEAR = "2026"

export interface NewsItem {
  id: string
  slug: string
  title: string
  summary: string
  href: string
  /** ISO date (YYYY-MM-DD) for sorting; newest first */
  date: string
  category?: string
  categoryBadgeClass?: string
  readTime?: string
  image?: string
  imagePosition?: "top" | "center"
  /** Use "contain" to show full image (e.g. product shots); default "cover" fills the card. */
  imageFit?: "cover" | "contain"
  /** On /news index: full-width image banner above text (hero-style). */
  newsListBanner?: boolean
  /** If true, this is an announcement (lives under /news/[slug]). If false, href is external (e.g. NCHSAA). */
  isAnnouncement?: boolean
}

/** All news items, newest first. Add new items here; they appear on /news and in home carousel by order. */
const ALL_NEWS: NewsItem[] = [
  {
    id: "nhsca-nationals-preview-2026",
    slug: "nhsca-nationals-preview-2026",
    title: "The Biggest Weekend in NC Wrestling Starts Thursday",
    summary:
      "Over 300 NC wrestlers head to NHSCA Nationals in Virginia Beach; MatScout’s Wednesday, March 25 seeding lists 29 with seeds. Ten returning All-Americans are seeded — the weekend is the state’s top recruiting showcase.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/nhsca-nationals-preview-2026`,
    date: "2026-03-26",
    image: "/images/nchsaa-2026-nhsca-nationals-preview.png",
    imagePosition: "center",
    /** Logo-style art: full-bleed cover clips the NHSCA wordmark */
    imageFit: "contain",
    newsListBanner: true,
    category: "NATIONALS",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "18 min read",
    isAnnouncement: false,
  },
  {
    id: "5-impactful-tournaments",
    slug: "5-impactful-tournaments",
    title: "The 5 Most Impactful Tournaments for NC College Recruiting",
    summary: "Which ones made the list? Data from 86 NC commits (Classes of 2025–2026) on NHSCA Nationals, Super32, College Opens, NHSCA Duals, Journeymen, plus Fargo and Junior National Duals.",
    href: "/recruiting/tournaments",
    date: "2026-03-10",
    image: "/images/recruiting-tournaments-hero.png",
    imagePosition: "center",
    imageFit: "cover",
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "12 min read",
    isAnnouncement: false,
  },
  {
    id: "first-flight-2026",
    slug: "first-flight-2026-nc-united-shoe",
    title: "First Flight: The Official 2026 NC United Shoe",
    summary: "The wrestling community has spoken. After 726 visits and 344 votes, First Flight is the inaugural 2026 NC United custom wrestling shoe — in partnership with Classified Creations. Limited to 25 pairs.",
    href: "/news/first-flight-2026-nc-united-shoe",
    date: "2026-03-01",
    category: "ANNOUNCEMENT",
    categoryBadgeClass: "bg-[#C20017]",
    readTime: "5 min read",
    image: "/images/first-flight-2026-nc-united-shoe.png",
    imagePosition: "center",
    imageFit: "contain",
    isAnnouncement: true,
  },
  {
    id: "three-join-the-immortals",
    slug: "three-join-the-immortals-2026",
    title: "Three Join the Immortals: North Carolina's Historic 2026 Four-Time State Champions",
    summary: "For the first time in nearly four decades, three four-time state champions were crowned in a single year — Cael Dunn, Lorenzo Alston, and Bentley Sly.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/three-join-the-immortals-2026`,
    date: "2026-02-26",
    image: "/images/nchsaa-2026-four-time-champions.png",
    imagePosition: "top",
    category: "CELEBRATION",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "14 min read",
    isAnnouncement: false,
  },
  {
    id: "bracket-depth",
    slug: "article-2",
    title: "Bracket Depth by the Numbers: What 98 Brackets Reveal",
    summary: "How bracket strength is measured and where ranked talent concentrated.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/article-2`,
    date: "2026-02-25",
    image: "/images/nchsaa-2026-7a-138-podium.png",
    imagePosition: "top",
    category: "DATA & RANKINGS",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "10 min read",
    isAnnouncement: false,
  },
  {
    id: "seven-divisions",
    slug: "seven-divisions-98-brackets-784-qualifiers",
    title: "Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?",
    summary: "When Structure Shapes Value — Part I: Diagnosis. A two-part conversation about North Carolina's classification system.",
    href: "/article/seven-divisions-98-brackets-784-qualifiers",
    date: "2026-02-25",
    image: "/images/nchsaa-2026-seven-divisions.png",
    category: "ANALYSIS",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "12 min read",
    isAnnouncement: false,
  },
]

/** All news, newest first. Use for /news index page. */
export function getAllNews(): NewsItem[] {
  return [...ALL_NEWS].sort((a, b) => (b.date > a.date ? 1 : -1))
}

/** First N items for home carousel (main story + others). Scalable: add to ALL_NEWS and it appears automatically. */
export function getFeaturedForHome(limit: number = 4): NewsItem[] {
  return getAllNews().slice(0, limit)
}

/** Get a single announcement by slug (for /news/[slug] page). */
export function getAnnouncementBySlug(slug: string): NewsItem | undefined {
  return ALL_NEWS.find((item) => item.isAnnouncement && item.slug === slug)
}

/** Slugs that are announcement pages (for generateStaticParams). */
export function getAnnouncementSlugs(): string[] {
  return ALL_NEWS.filter((item) => item.isAnnouncement).map((item) => item.slug)
}
