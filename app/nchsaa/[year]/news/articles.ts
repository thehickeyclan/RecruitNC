export interface NCHSAAArticle {
  slug: string
  title: string
  /** Short line for listing; optional until published */
  summary?: string
  /** YYYY-MM-DD; optional */
  date?: string
  /** If true, article page shows full content; else "Coming soon" */
  published: boolean
}

export const NCHSAA_2026_ARTICLES: NCHSAAArticle[] = [
  {
    slug: "seven-divisions-98-brackets-784-qualifiers",
    title: "Seven Divisions, 98 Brackets, 784 Qualifiers: The Question NC Wrestling Needs to Answer",
    summary: "When Structure Shapes Value — Part I: Diagnosis",
    date: "2026-02-25",
    published: true,
  },
  {
    slug: "article-2",
    title: "Article 2",
    summary: "Coming soon",
    published: false,
  },
  {
    slug: "article-3",
    title: "Article 3",
    summary: "Coming soon",
    published: false,
  },
  {
    slug: "article-4",
    title: "Article 4",
    summary: "Coming soon",
    published: false,
  },
]

export function getArticle(slug: string): NCHSAAArticle | undefined {
  return NCHSAA_2026_ARTICLES.find((a) => a.slug === slug)
}
