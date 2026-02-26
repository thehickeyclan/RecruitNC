export interface NCHSAAArticle {
  slug: string
  title: string
  /** Short line for listing; optional until published */
  summary?: string
  /** YYYY-MM-DD; optional */
  date?: string
  /** If true, article page shows full content; else "Coming soon" */
  published: boolean
  /** For news-style cards */
  category?: string
  /** Badge Tailwind class: bg-navy-900, bg-amber-600, bg-red-600, bg-green-600 */
  categoryBadgeClass?: string
  /** Part label e.g. "Part 1" */
  part?: string
  /** Subtitle / dek */
  subtitle?: string
  /** Preview quote for card */
  preview?: string
  /** e.g. "12 min read" */
  readTime?: string
  /** Optional card image path (e.g. /images/nchsaa-2026-seven-divisions.jpg) */
  image?: string
}

export const NCHSAA_2026_ARTICLES: NCHSAAArticle[] = [
  {
    slug: "seven-divisions-98-brackets-784-qualifiers",
    title: "Did North Carolina Wrestling Expand Divisions—And Shrink Our Future?",
    summary: "When Structure Shapes Value — Part I: Diagnosis",
    subtitle: "When Structure Shapes Value — A Two-Part Conversation About North Carolina's Classification System",
    preview:
      '"Before anything else: Our athletes deserve respect. State champions worked for it. Placers earned it. Qualifiers sacrificed for it. This conversation is not about diminishing effort. It is about protecting meaning."',
    category: "ANALYSIS",
    categoryBadgeClass: "bg-[#1a2332]",
    part: "Part 1",
    readTime: "12 min read",
    date: "2026-02-25",
    published: true,
    image: "/images/nchsaa-2026-seven-divisions.png",
  },
  {
    slug: "article-2",
    title: "Bracket Depth by the Numbers: What 98 Brackets Reveal",
    summary: "How bracket strength is measured and where ranked talent concentrated",
    subtitle: "How bracket strength is measured and where ranked talent concentrated",
    preview:
      "Bracket strength is determined by the number of ranked wrestlers competing. 77 of 80 ranked wrestlers competed at states. Two brackets were ELITE (4+ ranked), four were STRONG (3 ranked), and 82% were LIGHT (0-1 ranked).",
    category: "DATA & RANKINGS",
    categoryBadgeClass: "bg-amber-600",
    part: "Part 2",
    readTime: "10 min read",
    date: "2026-02-25",
    published: true,
  },
  {
    slug: "article-3",
    title: "Not All Brackets Were Equal: Celebrating the ELITE Bracket Warriors",
    subtitle: "The Great Divide in a Seven-Division System",
    preview:
      "Only 2 brackets (2% of all weight classes) qualified as ELITE. This piece celebrates the wrestlers who chose the hard path — who competed where every match mattered, where one mistake meant elimination, and where winning required beating multiple elite opponents.",
    category: "CELEBRATION",
    categoryBadgeClass: "bg-red-600",
    part: "Part 3",
    readTime: "8 min read",
    date: "2026-02-25",
    published: false,
  },
  {
    slug: "article-4",
    title: "2026 State Championship Highlights",
    subtitle: "Celebrating North Carolina's Wrestling Champions",
    preview:
      "The 2026 NCHSAA State Wrestling Championships brought together 784 state qualifiers across seven divisions, crowning 98 state champions and 392 medalists. Here are the standout performances and storylines from the tournament.",
    category: "HIGHLIGHTS",
    categoryBadgeClass: "bg-green-600",
    part: "Part 4",
    readTime: "6 min read",
    date: "2026-02-25",
    published: false,
  },
]

export function getArticle(slug: string): NCHSAAArticle | undefined {
  return NCHSAA_2026_ARTICLES.find((a) => a.slug === slug)
}
