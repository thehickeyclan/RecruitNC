/**
 * "How to use the Command Center" (Matt, 28 Oct 2026): the five steps of the recruiting path as a
 * parent's guide, and how to use Scout. Product help, not rules: it states no recruiting rule and
 * points to the rules library for every one.
 */
export type HowToStep = { n: number; title: string; what: string; how: string[]; where: { label: string; href: string }; scout: string }

export const HOW_TO_STEPS: HowToStep[] = [
  {
    n: 1,
    title: "Research colleges",
    what: "Find the colleges worth a closer look, at every level.",
    how: [
      "Open the college map. Filter by level and state, and tap a college to see its coaches, lineup, cost and the wrestlers from your state who went there.",
      "Start from the starter set on your home page: two colleges at every level, picked from academic fit, cost and your state.",
      "Use Compare to put up to four colleges side by side.",
    ],
    where: { label: "Open the college map", href: "/recruiting/college-map" },
    scout: "What colleges fit my wrestler's results?",
  },
  {
    n: 2,
    title: "Select your colleges",
    what: "Build My List toward 10 schools, across levels.",
    how: [
      "Tap Save to My List on any college. Everything else in the Command Center works from this list.",
      "Keep at least two levels on it. The home page tells you when the list is all one level.",
      "Set each college's stage as things happen: Interested, Reached out, Talking, Visited, Offer.",
    ],
    where: { label: "Open My List", href: "/my-recruiting/colleges" },
    scout: "Is our college list balanced across levels?",
  },
  {
    n: 3,
    title: "Understand the rules and timing",
    what: "Know what college coaches may do right now for your wrestler's class.",
    how: [
      "The Rules and timing page shows, in one line, which levels' coaches may call and write now and when the rest open, worked out for your wrestler's class.",
      "Every rule in Learn names the NCAA, NAIA or NJCAA document it comes from and the date we last checked it.",
    ],
    where: { label: "See what's allowed now", href: "/my-recruiting/rules" },
    scout: "When can college coaches call my wrestler?",
  },
  {
    n: 4,
    title: "Reach out",
    what: "Three moves for every college on My List.",
    how: [
      "Say interested: one tap tells the college's coaches, where they are on the platform to see it.",
      "Interest form: opens the college's form with your answers ready to copy. Tick it when it is in.",
      "Email the coach: a draft from your wrestler's verified results opens in your own email app. Using it ticks the step; tick it yourself if you wrote from somewhere else.",
    ],
    where: { label: "Open Reach out", href: "/my-recruiting/reach-out" },
    scout: "Draft an email from my wrestler to a coach on our list.",
  },
  {
    n: 5,
    title: "Monitor and engage",
    what: "Answer coaches, keep the schedule current, plan visits and set reminders.",
    how: [
      "Messages from college coaches arrive in Messages; Activity shows which programs viewed the profile.",
      "Add the next events to the schedule. Coaches following your wrestler see where to watch.",
      "Plan each visit with its dates and who is going. After the date, tell us whether it happened and the college moves to Visited.",
      "Set a reminder for a follow-up, a form or the day before a visit.",
    ],
    where: { label: "Open Schedule and visits", href: "/my-recruiting/plan" },
    scout: "What should we do next in our recruiting?",
  },
]

export const SCOUT_TIPS = [
  "Every step on your home page has an Ask Scout button with a question ready. Tap it and Scout answers for your wrestler.",
  "Scout knows your wrestler's class and results, every college program and its coaches, your list and who has viewed the profile.",
  "Ask Scout to draft a coach email. Read it, change anything that is not right, then send it yourself.",
  "Scout's rules come from the same library as Learn. Check anything important with the college's compliance office.",
]
