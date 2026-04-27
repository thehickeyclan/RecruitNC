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
  /** Optional deck line on /news/[slug] under the title */
  subtitle?: string
  /** Optional byline, e.g. "Jim Bernthal" */
  author?: string
  image?: string
  imagePosition?: "top" | "center"
  /** Use "contain" to show full image (e.g. product shots); default "cover" fills the card. */
  imageFit?: "cover" | "contain"
  /** With cover: scale up slightly so logo-style PNGs fill the banner. */
  imageBannerZoom?: boolean
  /**
   * When imageFit is "contain", background behind the image (default slate-100).
   * Use a dark class for campaign art so headline numbers read clearly.
   */
  imageBannerBgClass?: string
  /** On /news index: full-width image banner above text (hero-style). */
  newsListBanner?: boolean
  /** If true, this is an announcement (lives under /news/[slug]). If false, href is external (e.g. NCHSAA). */
  isAnnouncement?: boolean
}

/** All news items, newest first. Add new items here; they appear on /news and in home carousel by order. */
const ALL_NEWS: NewsItem[] = [
  {
    id: "finding-flow-on-the-mat",
    slug: "finding-flow-on-the-mat",
    title: "Finding Flow on the Mat",
    subtitle: 'How Wrestlers Experience "The Zone"',
    summary:
      "Elite NC United wrestlers describe trust, instinct, and full immersion — and how flow theory from Mihaly Csikszentmihalyi maps to what they feel in big matches, plus what breaks the zone and what helps get there before competition.",
    href: "/news/finding-flow-on-the-mat",
    date: "2026-04-16",
    image: "/images/finding-flow-on-the-mat-hero.png",
    imagePosition: "center",
    imageFit: "cover",
    /** Dark landscape art — use black frame on /news/[slug] hero */
    imageBannerBgClass: "bg-black",
    newsListBanner: true,
    category: "MINDSET",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "14 min read",
    author: "Jim Bernthal",
    isAnnouncement: true,
  },
  {
    id: "real-cost-elite-wrestling-nc-smarter-build",
    slug: "real-cost-elite-wrestling-nc-smarter-build",
    title: "What Elite Wrestling Really Costs — And When the Bill Rivals College",
    summary:
      "Headline numbers: about $15,000–$25,000 per year and $70,000–$100,000+ over a high school career — plus the full cost table, tax reality, roster caps, two levers (community + 529), and the Spartan × NC United model.",
    href: "/news/real-cost-elite-wrestling-nc-smarter-build",
    date: "2026-04-14",
    image: "/images/real-cost-elite-wrestling-nc-hero.png",
    imagePosition: "center",
    /** Landscape hero: fills home + /news cards; article body uses the same file (see real-cost content). */
    imageFit: "cover",
    newsListBanner: true,
    category: "NC UNITED",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "18 min read",
    isAnnouncement: true,
  },
  {
    id: "lynchburg-building-a-program-with-intention",
    slug: "lynchburg-building-a-program-with-intention",
    title: "Building a Program with Intention: Lynchburg’s NC Pipeline and Class of 2026",
    summary:
      "Class of ’26 NC board: Lynchburg leads (~2× the next) — new DIII program, 13,000+ sq ft facility, NC United ties, more names expected; Vincent Barber & Sammy Hillegas.",
    href: "/news/lynchburg-building-a-program-with-intention",
    date: "2026-04-13",
    image: "/images/lynchburg-hornets-facility-hero.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "8 min read",
    isAnnouncement: true,
  },
  {
    id: "class-of-2026-senior-sendoff",
    slug: "class-of-2026-senior-sendoff",
    title: "Final Class of 2026 Rankings: A Senior Sendoff",
    summary:
      "Celebrating North Carolina's Class of 2026 as they close their high school careers — NHSCA, Super 32, IronMan, four-time state champions, college opens, and 24 commits across NCAA and NAIA.",
    href: "/news/class-of-2026-senior-sendoff",
    date: "2026-04-02",
    image: "/images/class-of-2026-senior-sendoff-hero.png",
    imageFit: "contain",
    newsListBanner: true,
    category: "CLASS OF 2026",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "7 min read",
    isAnnouncement: true,
  },
  {
    id: "nhsca-mow-award-2026",
    slug: "nhsca-most-outstanding-wrestler-award-2026",
    title: "NC United Launches the NHSCA Most Outstanding Wrestler Award",
    summary:
      "A new annual award honoring North Carolina's top performer in each NHSCA division at the tournament that matters most for recruiting futures.",
    href: "/news/nhsca-most-outstanding-wrestler-award-2026",
    date: "2026-03-31",
    image: "/images/nhsca-mow-award-2026-news-card.png",
    imagePosition: "top",
    imageFit: "contain",
    newsListBanner: true,
    category: "OFFICIAL ANNOUNCEMENT",
    categoryBadgeClass: "bg-[#C20017]",
    readTime: "9 min read",
    isAnnouncement: true,
  },
  {
    id: "nhsca-nationals-recap-2026",
    slug: "nhsca-nationals-recap-2026",
    title: "North Carolina Puts 18 on the Podium at 2026 NHSCA Nationals",
    summary:
      "North Carolina finished with 18 All-Americans across four divisions at the 2026 NHSCA Nationals, ranking eighth nationally and fourth in state history.",
    href: "/news/nhsca-nationals-recap-2026",
    date: "2026-03-31",
    image: "/images/nhsca-nationals-recap-2026-team-photo.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "NATIONALS RECAP",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "11 min read",
    isAnnouncement: true,
  },
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
