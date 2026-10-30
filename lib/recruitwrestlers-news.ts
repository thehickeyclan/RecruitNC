/**
 * RecruitWrestlers' News stories (app/recaps/page.tsx), newest first. Shared with the menu's
 * "New" tag (app/api/nav/new), so a story added here is news in both places.
 */
export type Story = {
  href: string
  title: string
  summary: string
  date: string
  readTime: string
  /** The tile's picture; a story without one gets a lettered tile. */
  image: string | null
  category: string
  state: string
  premium: boolean
  /** A draft until its publish switch is on; admins see it marked as a draft. */
  published: boolean
}

// The NC recaps are published (NC United published them 26 Oct); SC waits for Matt.
export const RW_STORIES: Story[] = [
  {
    href: "/recaps/beyond-the-mat",
    title: "Choosing a College for the Next 40 Years",
    summary: "Every wrestler has a final match. How to leverage wrestling for a lifetime of opportunity: the people, the academics and future, the wrestling, and the money.",
    date: "2026-10-28",
    readTime: "10 min read",
    // Matt's photo, 29 Oct 2026: a family walking a campus.
    image: "/images/news/college-recruiting-5-questions.webp",
    // The column name (Matt, 30 Oct 2026): a series about life after wrestling, not this headline.
    category: "Beyond the Mat",
    state: "All",
    premium: false,
    // Published by Matt, 30 Oct 2026.
    published: true,
  },
  {
    href: "/recaps/super32-2026-sc",
    title: "Super 32 2026: South Carolina Boys Recap",
    summary: "Nine winning records, the most in three years, and Sy Strobel's win over the reigning NHSCA national champion. Every SC boy graded on who he beat.",
    date: "2026-10-26",
    readTime: "10 min read",
    image: "/recruitwrestlers/recaps/sc-share-card.jpg",
    category: "Super 32",
    state: "SC",
    premium: true,
    // Published by Matt, 29 Oct 2026.
    published: true,
  },
  {
    href: "/recaps/super32-2026-nc-boys",
    title: "Super 32 2026: North Carolina Boys Recap",
    summary: "11 wins over top-15 seeds, up from 6 and 2, and Braylen Yates on the podium. Every NC boy graded on who he beat and how far he went.",
    date: "2026-10-26",
    readTime: "12 min read",
    image: "/images/news/super32-2026-boys-recap/share-card.jpg",
    category: "Super 32",
    state: "NC",
    premium: true,
    published: true,
  },
  {
    href: "/recaps/super32-2026-nc-girls",
    title: "Super 32 2026: North Carolina Girls Recap",
    summary: "Lauren Samuel and Ella Taylor both finished 3rd. Every NC girl graded on who she beat and how far she went.",
    date: "2026-10-26",
    readTime: "8 min read",
    image: "/images/news/super32-2026-girls-recap/share-card.jpg",
    category: "Super 32",
    state: "NC",
    premium: true,
    published: true,
  },
]
