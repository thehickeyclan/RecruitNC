/**
 * The transfer portal, for a high school family (Matt, 18 Oct 2026, from a draft guide cleaned up
 * and checked). Every rule here was read against its official source on October 18, 2026, and
 * links to it; anything that could not be confirmed was left out rather than hedged (Division II's
 * eligibility model at first - since confirmed and added - the women's-programs percentages, a second
 * women's champion's transfer).
 * Advice is marked as ours. The Division I women's window is the rules library's, not repeated
 * from memory (content.ts, Division I page).
 */

export const TRANSFER_CHECKED = "2026-10-18"

export type TransferSource = { label: string; url: string }

const S = {
  d1Window: { label: "NCAA: Division I Cabinet adopts new transfer windows, January 2026", url: "https://www.ncaa.org/news/media-center-division-i-cabinet-adopts-new-transfer-windows-in-several-sports/" },
  nwca: { label: "NWCA: transfer window approved by the Division I Cabinet", url: "https://nwcaonline.com/news/2026/1/14/national-wrestling-coaches-association-nwca-initiative-on-transfer-portal-approved-by-ncaa-division-i-cabinet.aspx" },
  d1Manual: { label: "2026-27 NCAA Division I Manual, Bylaw 13.1.1.3", url: "https://web3.ncaa.org/lsdbi/reports/getReport/90008" },
  d2Football: { label: "NCAA: Division II adopts a transfer window for football, April 29, 2026", url: "https://www.ncaa.org/news/2026/4/29/media-center-division-ii-executive-board-adopts-transfer-window-legislation-for-football.aspx" },
  d3Webinar: { label: "NCAA Division III: Proposal 2026-9, the transfer portal (April 2026)", url: "https://ncaaorg.s3.amazonaws.com/governance/d3/webinar/Apr2026D3Gov_webinar.pdf" },
  d1Eligibility: { label: "NCAA: Division I adopts age-based eligibility model, June 23, 2026", url: "https://www.ncaa.org/news/2026/6/23/media-center-division-i-adopts-age-based-eligibility-model.aspx" },
  d2Eligibility: { label: "NCAA: Division II adopts age-based eligibility model", url: "https://www.ncaa.org/news/division-ii-adopts-age-based-eligibility-model/" },
  transferHub: { label: "NCAA: transfer rules and eligibility", url: "https://www.ncaa.org/eligibility-center/transfer-rules-and-eligibility/" },
  twoYearGuide: { label: "NCAA Guide for Two-Year Transfers, 2025-26", url: "http://fs.ncaa.org/Docs/eligibility_center/Transfer/TwoYearGuide.pdf" },
  cardenasBigTen: { label: "Michigan Athletics: Cardenas wins the 197-pound Big Ten title", url: "https://mgoblue.com/news/2025/3/9/wrestling-cardenas-wins-197-pound-big-ten-title-wolverines-earn-seven-automatic-ncaa-bids" },
  cardenasSeason: { label: "Michigan Athletics: 2024-25 season review", url: "https://mgoblue.com/news/2025/4/10/season-review-2024-25-michigan-wrestling" },
  cardenasMove: { label: "FloWrestling: Michigan adds two-time All-American Jacob Cardenas", url: "https://flowrestling.org/articles/12405034-michigan-adds-two-time-all-american-197-pounder-jacob-cardenas" },
  hamiti: { label: "The O'Colly: Hamiti wins the 174-pound national title", url: "https://www.ocolly.com/sports/wrestling/osu-s-dean-hamiti-jr-wins-174-pound-national-title/article_6c8643f0-2018-48e6-914b-9d932386c4b5.html" },
  womensFirst: { label: "NCAA.com: McKendree claims the first NCAA women's wrestling championship", url: "https://www.ncaa.com/news/wrestling-women/article/2026-03-07/history-made-mckendree-claims-first-ncaa-womens-wrestling-championship-tops" },
  womensD3: { label: "NCAA: Division III establishes a women's wrestling championship, January 2026", url: "https://www.ncaa.org/news/2026/1/16/media-center-division-iii-delegates-approve-establishment-of-diii-womens-wrestling-championships.aspx" },
} satisfies Record<string, TransferSource>

export const TRANSFER_SUMMARY = [
  "The transfer portal has not ended high school recruiting. It has made college rosters change faster.",
  "A proven college wrestler and a graduating senior can be competing for the same spot.",
  "One starter per weight: the room at your wrestler's college weight matters more than the school's name.",
  "The rules differ for Division I, II and III, the NAIA and junior college.",
  "Revisit your college list every few months. A crowded room in September can have an opening by spring.",
]

export const PORTAL_STEPS = [
  "The college wrestler decides to explore a transfer and notifies their college.",
  "The college's compliance office enters them in the portal.",
  "Coaches at other colleges may contact them, within their division's rules.",
  "The wrestler weighs the options.",
  "The new college decides on admission, credits, aid and eligibility.",
]

/** Rules by level: what is verified, and its source. */
export const TRANSFER_RULES: Array<{ level: string; how: string; point: string; sources: TransferSource[] }> = [
  {
    level: "Division I men",
    how: "April 1–30",
    point: "A 30-day window to give notice of transfer, opening after the national championships. It replaced a 45-day window that began at championship selections. There are exceptions; ask the compliance office.",
    sources: [S.d1Window, S.nwca],
  },
  {
    level: "Division I women",
    how: "Feb 28 – Apr 13, 2027",
    point: "Women's wrestling has its own window, not the men's April one.",
    sources: [S.d1Manual],
  },
  {
    level: "Division II",
    how: "No wrestling window",
    point: "Division II's only transfer window, adopted in April 2026, is for football. Wrestlers still go through the notification-of-transfer process.",
    sources: [S.d2Football],
  },
  {
    level: "Division III",
    how: "Notification of transfer, from Aug 1, 2026",
    point: "Proposal 2026-9 replaced permission to contact. A wrestler can self-release to talk privately with another Division III college for 30 days; to transfer or keep talking, they give notice of transfer.",
    sources: [S.d3Webinar],
  },
  {
    level: "NAIA",
    how: "Its own process",
    point: "The NAIA does not use the NCAA portal. Moving between an NAIA and an NCAA college means checking both sets of rules.",
    sources: [S.transferHub],
  },
  {
    level: "Junior college to NCAA",
    how: "The two-year transfer rules",
    point: "Credits, academic standing and enrollment history decide when a wrestler can compete. It is not the four-year portal process.",
    sources: [S.twoYearGuide, S.transferHub],
  },
]

export const CASE_STUDIES: Array<{ name: string; move: string; from: string; to: string; weights: string; results: string[]; story: string; lesson: string; sources: TransferSource[] }> = [
  {
    name: "Jacob Cardenas",
    move: "Cornell → Michigan, 197",
    from: "Cornell",
    to: "Michigan",
    weights: "197",
    results: ["Big Ten champion", "NCAA 4th", "24–3"],
    story:
      "Two All-America finishes at Cornell (8th in 2023, 4th in 2024). With a season of eligibility left after graduating, which Ivy League rules would not let him use as a graduate student there, he joined Michigan. He won the 2025 Big Ten title and placed 4th at the NCAA Championships, going 24–3.",
    lesson: "A college can recruit a wrestler whose college results are already proven, not just projected.",
    sources: [S.cardenasBigTen, S.cardenasSeason, S.cardenasMove],
  },
  {
    name: "Dean Hamiti",
    move: "Wisconsin → Oklahoma State, 165 → 174",
    from: "Wisconsin",
    to: "Oklahoma State",
    weights: "165 → 174",
    results: ["NCAA champion", "27–1"],
    story: "Hamiti wrestled 165 for Wisconsin and 174 for Oklahoma State. In 2024–25 he went 27–1 and won the NCAA title, beating Missouri's Keegan O'Toole 4–1 in sudden victory.",
    lesson: "The chance at a college depends on the weight a wrestler will actually wrestle there, the roster and the coach's plan.",
    sources: [S.hamiti],
  },
]

/**
 * The 2026-27 recruiting and transfer calendar, for the timeline graphic: every date from a
 * checked source (the women's window and signing from the rules library, content.ts).
 */
export const CALENDAR_START = "2026-08-01"
export const CALENDAR_END = "2027-07-31"
export const TRANSFER_CALENDAR: Array<{ label: string; detail: string; from: string; to?: string; tone: "signing" | "men" | "women" | "rule" | "event" }> = [
  { label: "Division III rule change", detail: "Notification of transfer begins, Aug 1", from: "2026-08-01", tone: "rule" },
  { label: "Seniors sign", detail: "First signing date, Nov 11", from: "2026-11-11", tone: "signing" },
  { label: "D1 women's window", detail: "Feb 28 – Apr 13", from: "2027-02-28", to: "2027-04-13", tone: "women" },
  { label: "D1 championships", detail: "Mar 16–21", from: "2027-03-16", to: "2027-03-21", tone: "event" },
  { label: "D1 men's window", detail: "Apr 1–30", from: "2027-04-01", to: "2027-04-30", tone: "men" },
]

/** Our advice, not rules. */
export const PORTAL_IMPACT = [
  { title: "Some openings go to transfers", text: "A college that needs a contender next season may prefer a proven college wrestler at that weight." },
  { title: "Lineups change quickly", text: "Starters graduate, wrestlers transfer out or change weight, recruits commit elsewhere. A roster is a moving picture." },
  { title: "Recruited is not promised", text: "A coach can want your wrestler even with a starter at the same weight. Ask specific questions." },
  { title: "Different timelines", text: "A transfer fills a short-term need; a high school recruit is often a multi-year plan. Neither is better in general." },
  { title: "Look at every level", text: "Division II, III, NAIA and junior college programs offer different mixes of competition, academics and cost." },
]

export const FAMILY_CHECKLIST = [
  "Build a wider list across levels: academics, cost, wrestling level, location.",
  "Study the room at your wrestler's likely college weight: who returns, eligibility left, recruits, transfers, nearby weights.",
  "Ask coaches how your wrestler fits, who is near that weight, and how a transfer would change the plan.",
  "Keep the profile current: results, best wins, grades, upcoming events.",
  "Separate interest from money. Get any aid or roster offer in writing.",
  "Revisit the list every few months.",
]

export const COACH_QUESTIONS_TRANSFER = [
  { q: "Who's in the room?", a: "The projected starter and the wrestlers at nearby weights." },
  { q: "Who's coming?", a: "Incoming recruits and announced transfers: signed, not rumoured." },
  { q: "What's the first-year plan?", a: "Training, academic support, competition, and how progress is measured." },
  { q: "What's actually promised?", a: "Conversations versus written aid, admission and roster commitments." },
  { q: "What if the lineup changes?", a: "How the staff would revisit the plan if a transfer arrives." },
]

export const JUCO_QUESTIONS = [
  "Will my intended major accept these credits?",
  "Which NCAA eligibility category was I in out of high school?",
  "What GPA and credits will I need?",
  "Do I need an associate degree?",
  "Have I ever enrolled full time at a four-year college?",
  "Will the new college's compliance office confirm my eligibility in writing?",
]

export const ELIGIBILITY_CLOCK = {
  text: "Division I adopted an age-based model on June 23, 2026, and Division II the same model for 2026-27: up to five years of eligibility for athletes who enroll no later than the academic year after their 19th birthday. It applies to athletes first enrolling full time in fall 2027 or later; current athletes and fall 2026 freshmen get whichever is more favourable, the old rules or the new. Junior college is not a free pass: time and seasons there can count toward a wrestler's NCAA eligibility and never reset it. How much remains depends on the full history, and the NCAA college's compliance office decides.",
  sources: [S.d1Eligibility, S.d2Eligibility],
}

export const WOMENS = {
  text: "The first NCAA women's wrestling championships were held March 6–7, 2026. McKendree, a Division II program, won the team title, clinched by Yu Sakamoto's win at 117. Division III, with 55 programs and more than half the colleges that sponsor the sport, gets its own championship from spring 2028. For a girl, the best fit is often outside Division I.",
  sources: [S.womensFirst, S.womensD3],
}

/** For Scout and search: the guide as plain text. */
export function transferPortalText(): string {
  return [
    "## The transfer portal, for high school families [link: learn:transfer-portal]",
    ...TRANSFER_SUMMARY.map((s) => `- ${s}`),
    "How it works: " + PORTAL_STEPS.join(" "),
    "Rules by level (checked " + TRANSFER_CHECKED + "):",
    ...TRANSFER_RULES.map((r) => `- ${r.level}: ${r.how}. ${r.point}`),
    ELIGIBILITY_CLOCK.text + " The clock starts at the earlier of first full-time college enrollment (junior college included) and the academic year after the 19th birthday. Scout does not know a wrestler's birth date; for one wrestler's seasons, point to the calculator [link: learn:eligibility-clock].",
    "Junior college to NCAA, questions to ask: " + JUCO_QUESTIONS.join(" "),
    "Examples: " + CASE_STUDIES.map((c) => `${c.name} (${c.move}): ${c.story}`).join(" "),
    "Women's wrestling: " + WOMENS.text,
    "Our advice (not rules): " + [...PORTAL_IMPACT.map((p) => `${p.title}: ${p.text}`), ...FAMILY_CHECKLIST].join(" "),
    "Questions for a coach: " + COACH_QUESTIONS_TRANSFER.map((c) => `${c.q} ${c.a}`).join(" "),
  ].join("\n")
}
