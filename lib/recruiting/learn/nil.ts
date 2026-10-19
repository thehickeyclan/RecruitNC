/**
 * NIL in wrestling, for families who have only heard the rumours (Matt, 19 Oct 2026: "assume
 * parents don't know what NIL is; there are people who think wrestling actually gets NIL in
 * substance"). Rebuilt from Matt's draft guide, every fact read against its source on 19 Oct 2026:
 *
 * - Kept and corrected: the 2026-27 cap is the College Sports Commission's ~$21.58M (the draft's
 *   $21.3M was an earlier projection); year one $1.77B to 34,915 athletes at 307 schools, 68 of 319
 *   at or near the cap; Ohio State's four sports; Penn State wrestling's ~$1.45M; the Senate vote.
 * - Left out: NIL Go's dollar thresholds and deadline (changed during 2026, sources disagree - the
 *   guide says to ask the compliance office), the April 2026 executive order, the 5% agent-fee cap,
 *   individual earnings figures beyond "reported six figures" for a few stars, and the draft's
 *   section for wrestling organisations.
 * - North Carolina's high school rules are the rules library's (content.ts), not restated here.
 */

export const NIL_CHECKED = "2026-10-19"

export type NilSource = { label: string; url: string }

const S = {
  csc: { label: "College Sports Commission: about the commission and the 2026-27 cap", url: "https://www.collegesportscommission.org/about/" },
  yearOne: { label: "Forbes: inside the first year of revenue sharing (CSC data, Oct 2026)", url: "https://www.forbes.com/sites/kristidosh/2026/10/02/college-athletes-received-18-billion-in-revenue-sharing-last-year/" },
  ohioState: { label: "Columbus Dispatch: which Ohio State sports receive revenue-sharing money in 2026-27", url: "https://www.aol.com/articles/ohio-state-sports-receive-revenue-140213086.html" },
  pennState: { label: "Nittany Sports Now: Penn State's FY2025 financial report", url: "https://nittanysportsnow.com/2026/02/5-key-takeaways-from-penn-states-fy2025-financial-report/" },
  rosterCap: { label: "FloWrestling: what the House settlement means for college wrestling", url: "https://flowrestling.org/articles/12571808-how-will-the-house-vs-ncaa-settlement-impact-college-wrestling" },
  ivy: { label: "The Daily Pennsylvanian: the Ivy League opts out of the settlement", url: "https://www.thedp.com/article/2025/01/ivy-league-opts-out-ncaa-settlement-prevents-direct-financial-compensation-athletes" },
  senate: { label: "ESPN: Senate votes 77-22 to pass the Protect College Sports Act", url: "https://www.espn.com/college-sports/story/_/id/50056206/us-senate-votes-77-22-pass-protect-college-sports-act" },
  nilGo: { label: "Kutak Rock: CSC memo on NIL review (June 2026)", url: "https://www.kutakrock.com/newspublications/publications/2026/june/csc-memo-nil-review-agent-agreements" },
  highSchool: { label: "Athletic Business: do NIL changes affect high school athletes?", url: "https://www.athleticbusiness.com/high-school/do-nil-changes-affect-high-school-student-athletes.html" },
  ndi: { label: "Business Wire: National Duals Invitational 2026 prize purse", url: "https://www.businesswire.com/news/home/20260121901811/en/National-Duals-Invitational-Adds-$150000-to-2026-Prize-Purse" },
  collectives: { label: "FloWrestling: NIL collectives enter wrestling", url: "https://www.flowrestling.org/articles/7686243-nil-collectives-enter-wrestling-penn-state-among-early-adopters" },
} satisfies Record<string, NilSource>

export const NIL_SUMMARY = [
  "NIL means being paid when a business uses your name, face or reputation: a local gym, a camp, a brand. It is not a salary for wrestling.",
  "Since July 2025, some Division I colleges also pay athletes directly. That is called revenue sharing, and each college decides which sports get it.",
  "Most colleges give wrestling little or none. Ohio State, a top wrestling school, pays revenue share to four sports, and wrestling is not one of them.",
  "A few stars at a handful of programs earn serious money. Most college wrestlers earn a few thousand dollars or nothing.",
  "For almost every family, scholarships and academic aid are worth far more than NIL. Plan around those.",
]

/** The three kinds of money people call "NIL". */
export const MONEY_TYPES: Array<{ name: string; who: string; where: string; capped: string; wrestling: string }> = [
  {
    name: "NIL deals",
    who: "Businesses, brands, fans and collectives",
    where: "Every level, and North Carolina high school under its rules",
    capped: "No cap; Division I deals are checked to be real marketing at a fair price",
    wrestling: "Mostly lessons, camps, local businesses and social posts",
  },
  {
    name: "Revenue sharing",
    who: "The college itself, from its athletics budget",
    where: "Division I colleges that opted in to the House settlement",
    capped: "About $21.58M per college for 2026-27, shared across every sport",
    wrestling: "The college chooses the split; most give wrestling little or none",
  },
  {
    name: "Prize money",
    who: "Events and leagues",
    where: "College and professional events",
    capped: "Set by each event's rules",
    wrestling: "A few team events and a pro freestyle league; a risk in North Carolina high school",
  },
]

/** What families have heard, and what is true. */
export const MYTHS: Array<{ heard: string; truth: string; sources?: NilSource[] }> = [
  {
    heard: "College wrestlers are getting rich from NIL.",
    truth: "A few national-level stars at a handful of programs earn six figures. Most college wrestlers earn a few thousand dollars a year or nothing. The money is real but extremely concentrated.",
    sources: [S.yearOne],
  },
  {
    heard: "NIL means the college pays my kid to wrestle.",
    truth: "Two different things. NIL is outside businesses paying for promotion. Revenue sharing is the college paying athletes directly, and only Division I colleges that opted in can do it.",
    sources: [S.csc],
  },
  {
    heard: "Every Division I college pays its wrestlers now.",
    truth: "Each college decides which sports get revenue share. In year one, only 68 of the 319 colleges that opted in paid out the full amount or close to it, and most of the money went to football and basketball. Ohio State pays four sports in 2026-27; wrestling is not one of them.",
    sources: [S.yearOne, S.ohioState],
  },
  {
    heard: "The 30-man roster means 30 scholarships.",
    truth: "Thirty is the most a Division I college that opted in may carry, and it may fund up to 30, but it does not have to. Many fund far fewer. Ask each college how many it actually funds.",
    sources: [S.rosterCap],
  },
  {
    heard: "A college can offer NIL money to get my wrestler to commit.",
    truth: "A deal has to be real marketing for a real business, not a reward for choosing a college, and a Division I college cannot put an NIL or revenue-share offer in writing before August 1 of senior year. Verbal NIL promises during recruiting often fall through.",
    sources: [S.nilGo],
  },
  {
    heard: "High schoolers can't do NIL.",
    truth: "North Carolina high school wrestlers can, with rules: a course first, no school names or logos, and no pay for performance. NIL done within the high school rules does not cost NCAA eligibility.",
    sources: [S.highSchool],
  },
  {
    heard: "Prize money at a tournament is fine, it's just NIL.",
    truth: "Not for a North Carolina high school wrestler. The NCHSAA's prize rule is stricter than the NCAA's, and taking prize money can end a high school season. Read the North Carolina rules before accepting anything.",
  },
  {
    heard: "NIL can replace a scholarship.",
    truth: "For almost every wrestler, athletic and academic aid are worth far more, and they come in writing. Treat NIL as a bonus, never the plan.",
  },
]

/** Where the money is, by level. */
export const BY_LEVEL: Array<{ level: string; revenue: string; nil: string }> = [
  { level: "Division I: top wrestling programs", revenue: "Some share revenue with wrestling, or have strong wrestling collectives", nil: "Stars and starters can earn meaningful money" },
  { level: "Division I: everyone else", revenue: "Revenue share goes mostly to football and basketball, if the college pays at all", nil: "Local deals, lessons and camps" },
  { level: "Ivy League", revenue: "Opted out: no revenue sharing and no athletic scholarships", nil: "Outside NIL deals only" },
  { level: "Division II", revenue: "Not part of the settlement: no revenue sharing", nil: "Outside NIL allowed; a small market" },
  { level: "Division III", revenue: "No revenue sharing and no athletic scholarships", nil: "Outside NIL allowed; usually modest" },
  { level: "NAIA and junior college", revenue: "Not part of the settlement", nil: "Outside NIL allowed; women's wrestling growing fast at both" },
]

/** Two real programs, in numbers. */
export const PROGRAM_EXAMPLES: Array<{ name: string; stat: string; text: string; sources: NilSource[] }> = [
  {
    name: "Penn State",
    stat: "≈ $1.45M",
    text: "Revenue share paid to wrestling in 2024-25, the third-most of any Penn State sport after football (about $13.3M) and men's basketball. Spread evenly over 30 wrestlers it would be about $48,000 each; in practice it is weighted to the lineup and the stars.",
    sources: [S.pennState],
  },
  {
    name: "Ohio State",
    stat: "$0",
    text: "Revenue share for wrestling in 2026-27. Ohio State pays the full amount allowed, but to four sports: football, men's and women's basketball and women's volleyball.",
    sources: [S.ohioState],
  },
]

/** North Carolina high school, from the rules library (content.ts, Staying eligible in North Carolina). */
export const NC_HIGH_SCHOOL = [
  "Allowed at NCHSAA member schools, under a state rule. Skipping a step makes the wrestler ineligible.",
  "The wrestler, and a parent, complete the NFHS NIL course at least 10 business days before signing.",
  "Under 18, a parent must be part of the agreement, and the school gets a full copy 10 business days before signing.",
  "No school name, logo, uniform or mascot, and the pay cannot depend on how the wrestler performs.",
  "Prize money is the trap: the NCHSAA's rule is stricter than the NCAA's and can end a high school season.",
]

export const ASK_A_COLLEGE = [
  "How many wrestling scholarships do you actually fund, and how many wrestlers do you carry?",
  "Does wrestling get any revenue share? How much, and how is it decided?",
  "Is there a collective or donor fund for wrestling here?",
  "What NIL do your wrestlers typically do: lessons, camps, local businesses?",
  "Can you put the scholarship and aid offer in writing?",
]

/** Once a wrestler is in college: for later, shown behind a tap. */
export const IN_COLLEGE = [
  "At Division I, outside deals above a set amount are reported to NIL Go, the College Sports Commission's clearinghouse, which checks the deal is real marketing at a fair price. The amounts and deadline changed during 2026: the college's compliance office has the current ones.",
  "Every deal must promote a real product or service. A 'deal' that pays for winning, enrolling, transferring or staying is not allowed.",
  "Clear any use of the college's name, logo or uniform with the college first.",
  "NIL income is taxable. Set some aside from every payment and keep records.",
  "Agents and advisers are allowed. Have a sports attorney or accountant read any significant contract before signing.",
]

export const HISTORY: Array<{ when: string; what: string; sources?: NilSource[] }> = [
  { when: "2014", what: "O'Bannon v. NCAA: the first big court win on athletes' likeness rights." },
  { when: "June 2021", what: "NCAA v. Alston, then NIL begins: college athletes may be paid for their name, image and likeness. Wrestlers like Spencer Lee, Gable Steveson and Roman Bravo-Young signed early deals." },
  { when: "2022", what: "Collectives arrive in wrestling, with Penn State among the first.", sources: [S.collectives] },
  { when: "July 2025", what: "The House settlement takes effect: Division I colleges that opted in may pay athletes directly, and wrestling's 9.9 scholarship limit becomes a 30-man roster limit.", sources: [S.rosterCap] },
  { when: "Sept 2026", what: "The Senate passes the Protect College Sports Act, 77-22, which would set national rules for NIL, transfers and eligibility. The House has not voted.", sources: [S.senate] },
  { when: "Oct 2026", what: "Year one in numbers: $1.77B paid to 34,915 athletes at 307 colleges.", sources: [S.yearOne] },
]

export const TEAM_PRIZE = {
  text: "Team prize money is new to college wrestling: the National Duals Invitational paid Ohio State $200,000 for winning in 2025, and its December 2026 event in Tulsa has a purse of more than $1.23M, $250,000 to the winner. NC State is among the invited teams.",
  sources: [S.ndi],
}

/** For Scout and search. */
export function nilText(): string {
  return [
    "## NIL and revenue sharing in wrestling [link: learn:nil]",
    ...NIL_SUMMARY.map((s) => `- ${s}`),
    "The three kinds of money: " + MONEY_TYPES.map((m) => `${m.name} (paid by ${m.who}; ${m.where}; ${m.capped}; wrestling: ${m.wrestling})`).join(" "),
    "What families hear, and what is true: " + MYTHS.map((m) => `"${m.heard}" ${m.truth}`).join(" "),
    "By level: " + BY_LEVEL.map((b) => `${b.level}: ${b.revenue}; ${b.nil}.`).join(" "),
    "Examples: " + PROGRAM_EXAMPLES.map((p) => `${p.name}: ${p.stat}. ${p.text}`).join(" "),
    "Questions to ask a college: " + ASK_A_COLLEGE.join(" "),
    "In college: " + IN_COLLEGE.join(" "),
    TEAM_PRIZE.text,
    "North Carolina high school NIL and prize money rules are on the Staying eligible in North Carolina page [link: learn:staying-eligible-in-north-carolina]. Never say a specific wrestler will earn NIL money.",
  ].join("\n")
}
