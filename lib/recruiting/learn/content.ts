/**
 * The Recruiting Command Center's rules library (13 Oct 2026).
 *
 * A family acting on a wrong rule pays for it, so this is held to a different standard from the
 * rest of the site's copy:
 *
 * - **Every section names where it came from.** Only the governing bodies' own documents: the
 *   2026-27 NCAA manuals and recruiting calendars, the NAIA and NJCAA handbooks, the NCHSAA
 *   handbook and North Carolina's rule. Recruiting-service pages are not sources - NCSA's wrestling
 *   pages disagree with each other on Division I contact dates and still describe the National
 *   Letter of Intent, which ended in 2024.
 * - **Each carries the date it was checked** (CHECKED). Rules change every year; a page that does
 *   not say when it was read is how NCSA's drifted.
 * - **What could not be confirmed from a primary source is not here.** No Eligibility Center fee,
 *   no list of which schools opted in to the House settlement, no verbal-offer date. Where the
 *   rule text needed reading rather than quoting, the section says so (`reading`).
 *
 * - **Wrestling only** (Matt, 13 Oct 2026): men's and women's wrestling at every level, and no
 *   other sport - not in a rule, not in an example, not in a source's label. The governing bodies'
 *   documents cover every sport, so a label names the wrestling part and the pages say the link
 *   opens the full document. A test holds this.
 *
 * To change a rule: change it here, with its source, and move CHECKED. Nothing else on the site
 * states a recruiting rule.
 */

export const CHECKED = "2026-10-13"

export const SOURCES = {
  d1Manual: { label: "2026-27 NCAA Division I Manual", url: "https://web3.ncaa.org/lsdbi/reports/getReport/90008" },
  d1Cabinet: {
    label: "NCAA Division I Cabinet report, April 2026 (Proposal 2026-12)",
    url: "https://ncaaorg.s3.amazonaws.com/committees/d1/cabinet/Apr2026D1Cabinet_Apr14Report.pdf",
  },
  d1Calendar: {
    label: "2026-27 NCAA Division I recruiting calendar (wrestling)",
    url: "https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2026-27/2026%E2%80%9327D1Rec_OtherRecruitingCalendar.pdf",
  },
  houseQa: {
    label: "NCAA Division I House settlement question and answer, May 2026",
    url: "https://ncaaorg.s3.amazonaws.com/governance/d1/legislation/May2026D1Gov_PhaseEightSetQuestionandAnswer.pdf",
  },
  cbsa: {
    label: "NCAA 2026-27 Guide for the College-Bound Student-Athlete",
    url: "https://s3.amazonaws.com/fs.ncaa.org/Docs/eligibility_center/Student_Resources/CBSA.pdf",
  },
  d2Manual: { label: "2026-27 NCAA Division II Manual", url: "https://web3.ncaa.org/lsdbi/reports/getReport/90010" },
  d2Guide: {
    label: "2026-27 NCAA Division II recruiting guide",
    url: "https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2026-27/2026-27D2REC_RecGuide.pdf",
  },
  d2Calendar: {
    label: "2026-27 NCAA Division II recruiting calendar (wrestling)",
    url: "https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2026-27/2026-27D2Rec_RecruitingCalendar_AllSports.pdf",
  },
  d3Manual: { label: "2026-27 NCAA Division III Manual", url: "https://web3.ncaa.org/lsdbi/reports/getReport/90011" },
  naiaGuide: {
    label: "NAIA Guide for the College-Bound Student-Athlete",
    url: "https://www.naia.org/wp-content/uploads/2026/05/naia_guide_college_bound_student.pdf",
  },
  naiaHandbook: { label: "2026-27 NAIA Official Handbook", url: "https://www.naia.org/wp-content/uploads/2026/07/2026_Official_Handbook.pdf" },
  njcaaBylaws: { label: "NJCAA Handbook and Bylaws 2026-27", url: "https://www.njcaa.org/compliance" },
  njcaaChart: {
    label: "NJCAA 2026-27 procedures chart (wrestling)",
    url: "https://ardor-prod-media.s3.us-east-2.amazonaws.com/files/404933495157163011/3fb3dae3297443a688333ba7d0cbef68-2026-2027-Sports-Procedures-Chart-9-9-26.pdf",
  },
  nchsaa: {
    label: "NCHSAA 2026-27 Handbook",
    url: "https://www.nchsaa.org/wp-content/uploads/2026/10/26-27-Handbook-Update-10626.pdf",
  },
  ncNil: {
    label: "North Carolina rule 16 NCAC 06E .0211 (name, image and likeness)",
    url: "http://reports.oah.state.nc.us/ncac/title%2016%20-%20education/chapter%2006%20-%20elementary%20and%20secondary%20education/subchapter%20e/16%20ncac%2006e%20.0211.pdf",
  },
  nwcaPortal: {
    label: "NWCA: transfer window approved by the Division I Cabinet, January 2026",
    url: "https://nwcaonline.com/news/2026/1/14/national-wrestling-coaches-association-nwca-initiative-on-transfer-portal-approved-by-ncaa-division-i-cabinet.aspx",
  },
} as const

export type SourceKey = keyof typeof SOURCES

export type LearnSection = {
  heading: string
  intro?: string
  /** A dated or labelled fact: "Coach may call" -> "April 1 of junior year". */
  rows?: Array<{ label: string; value: string }>
  bullets?: string[]
  /** Said plainly when the rule had to be read rather than quoted, so a family knows to confirm it. */
  reading?: string
  sources: SourceKey[]
}

export type LearnPage = {
  slug: string
  title: string
  /** One line for the index and the page's own lead. */
  summary: string
  /** Open to everyone; the rest of the library is part of NC United Blue. */
  free: boolean
  sections: LearnSection[]
}

/** The three sets of Division I contact dates. Which one applies is a fact about the wrestler, so the page asks. */
export type D1Track = "men-2028" | "men-2027" | "women"

export const D1_TRACK_LABEL: Record<D1Track, string> = {
  "men-2028": "Boys, Class of 2028 or later",
  "men-2027": "Boys, Class of 2027",
  women: "Girls, any class",
}

export function d1TrackFor(gender: string | null | undefined, classYear: number | null | undefined): D1Track {
  if (String(gender ?? "").toLowerCase().startsWith("f")) return "women"
  return classYear != null && classYear <= 2027 ? "men-2027" : "men-2028"
}

const D1_OLD_DATES: LearnSection["rows"] = [
  { label: "Coach may send recruiting materials, emails, texts and direct messages", value: "June 15 at the end of sophomore year" },
  { label: "Coach may call you, or take your call", value: "June 15 at the end of sophomore year" },
  { label: "Coach may meet you in person off campus", value: "August 1 at the start of junior year" },
  { label: "Recruiting conversation at the college's own camp or clinic", value: "August 1 at the start of junior year" },
  { label: "Official (paid) visit", value: "August 1 of junior year" },
  { label: "Unofficial visit involving the athletics department", value: "August 1 at the start of junior year" },
]

export const D1_CONTACT: Record<D1Track, LearnSection> = {
  "men-2028": {
    heading: "When a Division I coach can contact you",
    intro:
      "The NCAA changed the men's wrestling dates in April 2026. They apply to wrestlers who will start college on or after August 1, 2028: this year's juniors and younger.",
    rows: [
      { label: "Coach may send recruiting materials, emails, texts and direct messages", value: "April 1 of junior year" },
      { label: "Coach may call you, or take your call", value: "April 1 of junior year" },
      { label: "Coach may meet you in person off campus", value: "June 15 at the end of junior year" },
      { label: "Recruiting conversation at the college's own camp or clinic", value: "June 15 at the end of junior year" },
      { label: "Official (paid) visit", value: "August 15 of senior year" },
      { label: "Unofficial visit involving the athletics department", value: "August 15 of senior year" },
    ],
    bullets: [
      "You can email a coach or fill out a questionnaire before April 1 of junior year. He is not allowed to write back or take your call until then, so silence is the rule, not an answer.",
      "From June 15 after junior year a school gets seven recruiting opportunities with you each year, and no more than three of them may be off-campus contacts.",
    ],
    sources: ["d1Manual", "d1Cabinet"],
  },
  "men-2027": {
    heading: "When a Division I coach can contact you",
    intro:
      "The Class of 2027 stays on the dates that were in force before the April 2026 change. The new bylaws (13.1.3.1.8 and 13.4.1.8) apply only to wrestlers who first enrol in college on or after August 1, 2028.",
    rows: D1_OLD_DATES,
    sources: ["d1Manual", "d1Cabinet"],
  },
  women: {
    heading: "When a Division I coach can contact you",
    intro:
      "Women's wrestling keeps the June 15 dates. The April 2026 change was for men's wrestling only.",
    rows: D1_OLD_DATES,
    sources: ["d1Manual"],
  },
}

export const LEARN_PAGES: LearnPage[] = [
  {
    slug: "division-1",
    title: "NCAA Division I",
    summary: "Contact dates by class, the 2026-27 calendar, signing, the 30-wrestler roster limit and the academic standard.",
    free: false,
    sections: [
      {
        heading: "Offers, visits and what you can do now",
        bullets: [
          "A school may not put a scholarship or revenue-share offer in writing before August 1 of senior year, and it cannot be signed before the signing date.",
          "A verbal commitment is not binding on you or on the school.",
          "Official visits are unlimited overall, but one per school. A second to the same school is allowed after a head coaching change. Unofficial visits are unlimited once they are permitted.",
          "Before an official visit you need an NCAA Eligibility Center certification account, to be on the school's request list, and to have sent your transcripts.",
          "At any time you may email coaches your results, video and graduation year, fill out recruiting questionnaires, research schools and attend camps.",
        ],
        sources: ["d1Manual", "houseQa", "cbsa"],
      },
      {
        heading: "2026-27 calendar: men's wrestling",
        intro: "In a dead period there is no in-person contact and no visits; calls and messages are still allowed. In a recruiting shutdown there is no recruiting of any kind, calls and messages included.",
        rows: [
          { label: "Dead period", value: "November 9-12, 2026 (signing week)" },
          { label: "Recruiting shutdown", value: "December 24-26, 2026" },
          { label: "Recruiting shutdown", value: "March 16-21, 2027 (NCAA Division I Wrestling Championships)" },
          { label: "Dead period", value: "July 26 - August 1, 2027 (NWCA Convention week)" },
        ],
        sources: ["d1Calendar"],
      },
      {
        heading: "2026-27 calendar: women's wrestling",
        rows: [
          { label: "Dead period", value: "November 9-12, 2026 (signing week)" },
          { label: "Dead period", value: "July 26 - August 1, 2027" },
        ],
        sources: ["d1Calendar"],
      },
      {
        heading: "Signing",
        bullets: [
          "The National Letter of Intent ended in October 2024. What you sign now is the school's written athletics aid agreement.",
          "The first signing date for wrestling in 2026-27 is Wednesday, November 11, 2026, at 7 a.m.",
          "Once you sign, other NCAA scholarship schools must stop recruiting you. You may sign with one school only.",
        ],
        sources: ["d1Manual", "cbsa"],
      },
      {
        heading: "Scholarships and roster spots",
        intro:
          "Wrestling scholarships are split: a coach has a pool of scholarship money and divides it, so most wrestlers are on partial awards.",
        bullets: [
          "At schools that opted in to the House settlement (every ACC, Big Ten, Big 12, Pac-12 and SEC member, plus any school that chose to), the roster limit is 30 for men's wrestling and 30 for women's. There is no cap on scholarships within that roster.",
          "At Division I schools that did not opt in, there is no national roster limit and the older ceilings stand: 9.9 scholarships' worth for men's wrestling, 10 for women's.",
          "A roster spot is not guaranteed by an offer to walk on. With a limit of 30, ask for it in writing.",
        ],
        sources: ["d1Manual", "houseQa"],
      },
      {
        heading: "Academic standard",
        rows: [
          { label: "Core courses", value: "16: 4 English, 3 math (Algebra I or higher), 2 science, 1 more English, math or science, 2 social science, 4 additional" },
          { label: "The 10/7 rule", value: "10 of the 16, including 7 in English, math and science, finished before senior year starts" },
          { label: "Minimum core-course GPA", value: "2.3" },
          { label: "SAT or ACT", value: "Not required for NCAA eligibility since January 2023. A college may still want one for admission or scholarships." },
        ],
        sources: ["cbsa"],
      },
      {
        heading: "The transfer window, and why it matters to a high school senior",
        bullets: [
          "Men's wrestlers already in college must give notice of transfer between April 1 and April 30. The women's window in 2027 is February 28 to April 13.",
          "Coaches fill part of a 30-spot roster from that window, months after high school seniors could first sign in November.",
        ],
        sources: ["d1Manual", "nwcaPortal"],
      },
    ],
  },
  {
    slug: "division-2",
    title: "NCAA Division II",
    summary: "Coaches can call and write at any time. In-person contact and official visits open June 15 before junior year.",
    free: false,
    sections: [
      {
        heading: "When a Division II coach can contact you",
        rows: [
          { label: "Calls, texts, emails and recruiting materials", value: "Any time" },
          { label: "In-person contact off campus", value: "June 15 immediately before junior year" },
          { label: "Official (paid) visit", value: "June 15 immediately before junior year; one per school" },
          { label: "On-campus tryout", value: "June 15 immediately before junior year; one per school, and for wrestling it may not include competition" },
          { label: "Unofficial visits", value: "Unlimited, except during the signing dead period" },
        ],
        sources: ["d2Manual", "d2Guide"],
      },
      {
        heading: "2026-27 calendar and signing",
        rows: [
          { label: "Dead period", value: "November 9, 7 a.m. to November 11, 7 a.m., 2026: no in-person contact, no visits" },
          { label: "First signing date", value: "Wednesday, November 11, 2026, at 7 a.m." },
        ],
        bullets: [
          "Division II also replaced the National Letter of Intent with the school's athletics aid agreement, in October 2024.",
          "An offer may be made in writing earlier, but it cannot be signed before the signing date.",
        ],
        sources: ["d2Calendar", "d2Manual"],
      },
      {
        heading: "Scholarships",
        intro: "Split, like Division I: the money is a pool the coach divides among his wrestlers.",
        rows: [
          { label: "Men's wrestling", value: "Up to 9.0 scholarships' worth" },
          { label: "Women's wrestling", value: "Up to 10.0 scholarships' worth" },
        ],
        sources: ["d2Manual"],
      },
      {
        heading: "Academic standard",
        rows: [
          { label: "Core courses", value: "16: 3 English, 2 math, 2 science, 3 more English, math or science, 2 social science, 4 additional" },
          { label: "Minimum core-course GPA", value: "2.2" },
          { label: "If you fall short", value: "Partial qualifier: you may practise and receive aid, but not compete, in the first year" },
          { label: "SAT or ACT", value: "Not required for NCAA eligibility since January 2023" },
        ],
        sources: ["cbsa"],
      },
    ],
  },
  {
    slug: "division-3",
    title: "NCAA Division III",
    summary: "No athletic scholarships, no letter of intent and no recruiting calendar. Coaches can call and write at any time.",
    free: false,
    sections: [
      {
        heading: "When a Division III coach can contact you",
        rows: [
          { label: "Calls, texts, emails and recruiting materials", value: "Any time" },
          { label: "In-person contact off campus", value: "After you have finished sophomore year" },
          { label: "Official (paid) visit", value: "From January 1 of junior year; one per school, 48 hours at most" },
          { label: "Unofficial visits", value: "Unlimited, at any time" },
        ],
        sources: ["d3Manual"],
      },
      {
        heading: "Money and signing",
        bullets: [
          "Division III schools give no athletic scholarships. Aid is academic and need-based, on the same terms as any other student.",
          "There is no letter of intent. A school may offer a non-binding celebratory signing form once you have been admitted.",
          "Division III has no recruiting calendar: no dead periods or shutdowns.",
        ],
        sources: ["d3Manual", "cbsa"],
      },
      {
        heading: "Academic standard",
        bullets: [
          "There is no NCAA academic certification for Division III. Each college sets its own admission and eligibility standards.",
          "You do not need a paid Eligibility Center account for a Division III school; a free profile is enough.",
        ],
        sources: ["cbsa"],
      },
    ],
  },
  {
    slug: "naia",
    title: "NAIA",
    summary: "No recruiting calendar and few limits on contact. Its own eligibility centre, with a different academic rule from the NCAA's.",
    free: false,
    sections: [
      {
        heading: "Contact, visits and tryouts",
        bullets: [
          "The NAIA has no recruiting calendar and sets no date or grade at which a coach may first call or write. Its only contact limits concern athletes already enrolled at another college.",
          "Tryouts are allowed: up to two days per student at each school.",
          "A school may pay for your visit only if it does the same for other specially talented students.",
        ],
        sources: ["naiaGuide", "naiaHandbook"],
      },
      {
        heading: "Eligibility",
        intro: "Register with the NAIA Eligibility Center at PlayNAIA. It is separate from the NCAA's.",
        rows: [
          { label: "Registration fee", value: "$110 for a US or Canadian high school student; $170 international. A waiver is available through your counselor." },
          { label: "The rule", value: "Graduate from high school with a 2.3 GPA or better" },
          { label: "Or meet two of these three", value: "18 on the ACT or 970 on the SAT in one sitting; a 2.0 GPA; top half of your class" },
        ],
        sources: ["naiaGuide"],
      },
      {
        heading: "Scholarships and signing",
        bullets: [
          "The NAIA's 2026-27 handbook sets the limit for wrestling at 10 scholarships' worth per program. Men's and women's wrestling are separate NAIA championships, so a school with both has 10 for each.",
          "Older guides and some websites still show 8 for men. That figure is out of date.",
          "There is no association-wide letter of intent. You may sign with a school, but the NAIA does not bind you to attend.",
          "The NAIA permits name, image and likeness deals.",
        ],
        sources: ["naiaHandbook", "naiaGuide"],
      },
    ],
  },
  {
    slug: "njcaa",
    title: "NJCAA (junior college)",
    summary: "Two years, then a transfer. Paid visits from June 1 before junior year; signing opens November 1.",
    free: false,
    sections: [
      {
        heading: "Visits and signing",
        rows: [
          { label: "Official (paid) visit", value: "From June 1 before junior year; one per school each year, 48 hours at most, expenses for you and two guests" },
          { label: "Earliest signing date, wrestling", value: "November 1" },
          { label: "To sign", value: "You must have finished junior year" },
          { label: "The letter of intent", value: "Binding among NJCAA schools for one academic year" },
        ],
        bullets: [
          "The NJCAA sets no date before which a coach may call, message or visit a high school wrestler. Its contact limits protect only wrestlers who are in season at, or signed with, another NJCAA school.",
        ],
        sources: ["njcaaBylaws", "njcaaChart"],
      },
      {
        heading: "Scholarships",
        rows: [
          { label: "Men's wrestling", value: "Up to 20 scholarship signees" },
          { label: "Women's wrestling", value: "Up to 22 scholarship signees" },
          { label: "NJCAA Division I programs", value: "May cover tuition, fees, room and board, books, up to $250 in supplies and one round trip a year" },
          { label: "NJCAA Division II programs", value: "May cover tuition, fees, books and up to $250 in supplies; no room and board" },
          { label: "NJCAA Division III programs", value: "No athletic aid" },
        ],
        sources: ["njcaaChart", "njcaaBylaws"],
      },
      {
        heading: "Eligibility",
        bullets: [
          "The entrance requirement is a high school diploma or its equivalent. There is no minimum high school GPA, core-course list or test score.",
          "Once enrolled you must stay an amateur and keep up the credits and 2.00 GPA the NJCAA requires term by term.",
        ],
        sources: ["njcaaBylaws"],
      },
    ],
  },
  {
    slug: "eligibility-center",
    title: "The NCAA Eligibility Center",
    summary: "Which account you need, when to open it, and what must be done before an official visit.",
    free: false,
    sections: [
      {
        heading: "Which account",
        rows: [
          { label: "Profile Page (free)", value: "If you are undecided, or headed to a Division III school" },
          { label: "Academic and Athletics Certification account", value: "If a Division I or II school is recruiting you. Required for Division I official visits, for signing and for competing." },
        ],
        bullets: [
          "The NCAA's guide says to start a free profile before ninth grade, and move to a certification account in tenth grade if a Division I or II school is recruiting you.",
          "Walk-ons must register too.",
          "The fee for a certification account is not printed in the NCAA's 2026-27 guide. Check eligibilitycenter.org for the current amount; a waiver goes through your high school counselor.",
        ],
        sources: ["cbsa"],
      },
      {
        heading: "What puts eligibility at risk",
        bullets: [
          "Signing a professional contract, or a written agreement with an agent.",
          "Being paid, or given special benefits, for competing.",
          "Waiting to enrol while you keep competing. For wrestling there is a 12-month grace period after high school graduation; after that you can lose a season for each further year of competition.",
        ],
        sources: ["cbsa"],
      },
    ],
  },
  {
    slug: "staying-eligible-in-north-carolina",
    title: "Staying eligible in North Carolina",
    summary: "Prize money that the NCAA allows can still end a North Carolina wrestler's high school season. And how NIL works here.",
    free: true,
    sections: [
      {
        heading: "Prize money: the NCHSAA rule is stricter than the NCAA's",
        intro:
          "This is the one that catches families. The NCAA lets a high school wrestler keep prize money won on place or performance, paid by the event. The NCHSAA does not.",
        bullets: [
          "A North Carolina public school wrestler loses high school eligibility for accepting payment for competing.",
          "The only exception is a gift or merchandise worth $250 or less per student per season, that is consumable or permanently labelled, and approved by the principal and superintendent.",
          "Signing a professional contract ends a wrestler's high school eligibility. So does wrestling in an all-star event the NCHSAA has not sanctioned.",
          "The rule applies from the day a student enters ninth grade.",
        ],
        reading:
          "This covers NCHSAA member schools. Private schools in the NCISAA have their own rules, which we have not checked.",
        sources: ["nchsaa", "d1Manual"],
      },
      {
        heading: "Name, image and likeness (NIL) for North Carolina public school wrestlers",
        intro: "It is allowed, under a state rule the NCHSAA enforces. Skipping a step makes the student ineligible.",
        bullets: [
          "The pay may not depend on athletic performance.",
          "If the student is under 18, a parent must be a party to the agreement.",
          "The student gives the school the proposed agreement at least 10 business days before signing, and the signed copy within 5 business days after.",
          "The student, and a parent if the student is a minor, completes the NFHS NIL course at least 10 business days before signing.",
          "No school, conference or NCHSAA name, uniform, logo or mascot, and no promoting the sponsor during school competition.",
          "Not allowed at all: adult entertainment, alcohol, tobacco and vaping, cannabis, controlled substances, weapons, and gambling or betting of any kind.",
          "School staff, boosters and collectives may not use NIL to recruit a student to a school.",
        ],
        sources: ["ncNil", "nchsaa"],
      },
      {
        heading: "What about college?",
        bullets: [
          "A Division I school cannot put an NIL or revenue-share offer in writing before August 1 of senior year.",
          "The NCAA's own advice to high school wrestlers on NIL is to check with the state athletic association first: here, the NCHSAA.",
        ],
        sources: ["houseQa", "cbsa"],
      },
    ],
  },
]

export const learnPage = (slug: string) => LEARN_PAGES.find((page) => page.slug === slug) ?? null
