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
    title: "College Wrestling Recruiting: 5 Questions Every Family Should Ask",
    summary: "If wrestling went away tomorrow, would you still want to attend this school? Five questions about the people, the future, the wrestling, the academics and the money.",
    date: "2026-10-28",
    readTime: "8 min read",
    // Matt's photo, 29 Oct 2026: a family walking a campus.
    image: "/images/news/college-recruiting-5-questions.webp",
    category: "Recruiting advice",
    state: "All",
    premium: false,
    // Matt publishes it: staff only until this is true.
    published: false,
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
