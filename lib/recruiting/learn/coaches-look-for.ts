/**
 * "What college coaches look at" (15 Oct 2026): our advice, from working beside college coaches,
 * not a rule. Each point is something a family can act on, and links to where they do it. The
 * numbers on the page beside it are computed from our own records (went-here snapshot), never
 * written here.
 */
export type LookPoint = { title: string; text: string; link?: { label: string; href: string } }

export const LOOK_POINTS: LookPoint[] = [
  {
    title: "Who you beat, not your record",
    text: "A 40-5 season against a soft schedule says less than 25-12 against state placers. Coaches look at the names on the other side of your wins, and at close losses to wrestlers they already know.",
    link: { label: "Tournaments coaches watch", href: "/recruiting/learn/tournaments" },
  },
  {
    title: "The big events",
    text: "A state placing is the first thing most coaches check. National events (Fargo, Super 32, NHSCA, the big national duals) put a wrestler in front of coaches from every level at once, against the wrestlers they are also recruiting.",
    link: { label: "The events, men's and women's", href: "/recruiting/learn/tournaments" },
  },
  {
    title: "Which way you are heading",
    text: "A wrestler who climbs every year (qualifier, then placer, then finalist) is often more interesting than one who peaked early. Keep every season's results on the profile so the climb is visible.",
    link: { label: "Your profile", href: "/my-recruiting" },
  },
  {
    title: "Your college weight",
    text: "Coaches recruit for the weight you will wrestle in college, not the one you wrestle now, and for the gaps on their own roster. A crowded weight on one team can be wide open on another.",
    link: { label: "Roster depth on each college's page", href: "/recruiting/college-map" },
  },
  {
    title: "Grades and admission",
    text: "A coach can only recruit a wrestler the college will admit. Strong grades widen the list, and at many colleges they bring academic money that stacks with what wrestling can offer.",
    link: { label: "How academics change the price", href: "/recruiting/learn/paying-for-college" },
  },
  {
    title: "Full matches on video",
    text: "Highlights get a look; full matches get an evaluation. Keep a few complete matches against good opponents ready to send, with the wrestler's singlet colour and bout number noted.",
  },
  {
    title: "How you handle the process",
    text: "Coaches notice who answers within a day, who fills in the questionnaire before writing, and how a wrestler talks to them, not only how a parent does. A high school or club coach who will vouch for the wrestler matters too.",
    link: { label: "Working the process", href: "/recruiting/learn/working-the-process" },
  },
]
