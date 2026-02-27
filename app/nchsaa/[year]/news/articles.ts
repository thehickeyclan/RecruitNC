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
  /** Use "top" so people/faces stay visible when image is cropped */
  imagePosition?: "top" | "center"
}

export const NCHSAA_2026_ARTICLES: NCHSAAArticle[] = [
  {
    slug: "seven-divisions-98-brackets-784-qualifiers",
    title: "Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?",
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
    image: "/images/nchsaa-2026-7a-138-podium.png",
  },
  {
    slug: "three-join-the-immortals-2026",
    title: "Three Join the Immortals: North Carolina's Historic 2026 Four-Time State Champions",
    summary: "For the first time in nearly four decades, three four-time state champions were crowned in a single year",
    subtitle: "Cael Dunn, Lorenzo Alston, and Bentley Sly — 17 names on a list that spans from 1987 to 2026",
    preview:
      "Only 14 wrestlers in North Carolina history had achieved it. Never — in nearly four decades — had three done it in the same year. Until February 22, 2026.",
    category: "CELEBRATION",
    categoryBadgeClass: "bg-[#1a2332]",
    imagePosition: "top",
    part: "Part 3",
    readTime: "14 min read",
    date: "2026-02-26",
    published: true,
    image: "/images/nchsaa-2026-four-time-champions.png",
  },
]

/** Only the 3 State Championship Series articles (Part 1, 2, 3) are shown on /nchsaa/2026 and home. */

export function getArticle(slug: string): NCHSAAArticle | undefined {
  return NCHSAA_2026_ARTICLES.find((a) => a.slug === slug)
}
