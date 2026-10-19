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

/** Every rule was last read against its source, sentence by sentence, on this date. */
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
  naiaHs: {
    label: "NAIA: information for high school students",
    url: "https://www.naia.org/student-athletes/prospective/high-school-students/",
  },
  naiaHandbook: { label: "2026-27 NAIA Official Handbook", url: "https://www.naia.org/wp-content/uploads/2026/07/2026_Official_Handbook.pdf" },
  njcaaBylaws: { label: "NJCAA Handbook and Bylaws 2026-27",
    url: "https://media.ardorsportshub.com/files/404933495157163011/6b815aea7cf842719e5deeefd7dc9310-NJCAA-Handbook---Bylaws---2026-27-9-9-26.pdf", },
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
  ecRegister: {
    label: "NCAA Eligibility Center registration (account types and fees)",
    url: "https://web3.ncaa.org/ecwr3/",
  },
  ecFaq: { label: "NCAA Eligibility Center: registering and fee waivers", url: "https://www.ncaa.org/eligibility-center/register/" },
  ageRule: {
    label: "NCAA: age-based eligibility rules",
    url: "https://www.ncaa.org/eligibility-center/division-i-age-based-eligibility-rules/",
  },
  ncisaaRules: {
    label: "NCISAA 2026-27 General Rules and Regulations",
    url: "https://www.ncisaa.org/wp-content/uploads/2026/09/2026-27-General-R-R-1-1.pdf",
  },
  ncisaaNil: {
    label: "NCISAA name, image and likeness policy",
    url: "https://www.ncisaa.org/wp-content/uploads/2024/08/NCISAA-NIL-Policy-2024.pdf",
  },
  ivy: {
    label: "Ivy League: information for prospective athletes",
    url: "https://ivyleague.com/sports/2017/7/28/information-psa-index.aspx",
  },
  netPrice: {
    label: "US Department of Education: Net Price Calculator Center",
    url: "https://collegecost.ed.gov/net-price",
  },
  fafsa: { label: "Federal Student Aid (FAFSA)", url: "https://studentaid.gov/h/apply-for-aid/fafsa" },
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
  /** Ours, not a rule: what we would do with the rule. Shown apart so nobody mistakes it for one. */
  advice?: string
  /** The rule numbers behind the section, so a family or a compliance office can go straight to them. */
  rule?: string
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
      "The NCAA changed the men's wrestling dates in April 2026. They apply to wrestlers who will first enrol in college full time on or after August 1, 2028: for most families, this year's juniors and younger.",
    rows: [
      { label: "Coach may send recruiting materials, emails, texts and direct messages", value: "April 1 of junior year" },
      { label: "Coach may call you, or take your call", value: "April 1 of junior year" },
      { label: "Coach may meet you in person off campus", value: "June 15 at the end of junior year" },
      { label: "Recruiting conversation at the college's own camp or clinic", value: "June 15 at the end of junior year" },
      { label: "Official (paid) visit", value: "August 15 of senior year" },
      { label: "Unofficial visit involving the athletics department", value: "August 15 of senior year" },
    ],
    bullets: [
      "You can email a coach before April 1 of junior year. The coach may not send recruiting messages or take your call until then. The most a coach may send is a reply that does not recruit you, camp information, or a referral to admissions, so silence is the rule, not an answer.",
      "A school gets seven recruiting opportunities with you each year, contacts and evaluations combined. From June 15 after junior year, no more than three of them may be off-campus contacts. Contact during a visit does not count.",
    ],
    rule: "Bylaws 13.1.1.1.11, 13.1.3.1.8, 13.1.3.2.10, 13.1.5.10, 13.4.1.8, 13.6.2.1.8, 13.7.1.8 and 13.12.1.5.8, adopted April 15, 2026",
    sources: ["d1Manual", "d1Cabinet"],
  },
  "men-2027": {
    heading: "When a Division I coach can contact you",
    intro:
      "The Class of 2027 stays on the dates that were in force before the April 2026 change. Each of the new men's wrestling bylaws applies only to wrestlers who first enrol in college full time on or after August 1, 2028. A 2027 graduate who waits until then to enrol moves to the new dates.",
    rows: D1_OLD_DATES,
    rule: "The general Division I dates: Bylaws 13.1.1.1, 13.1.3.1, 13.1.3.2.5, 13.4.1, 13.6.2.1.1, 13.7.1.1 and 13.12.1.5.1. The men's wrestling exceptions carry the August 1, 2028 clause.",
    sources: ["d1Manual", "d1Cabinet"],
  },
  women: {
    heading: "When a Division I coach can contact you",
    intro:
      "Women's wrestling keeps the June 15 dates. The April 2026 change was for men's wrestling only.",
    rows: D1_OLD_DATES,
    rule: "Bylaws 13.1.1.1, 13.1.3.1, 13.1.3.2.5, 13.4.1, 13.6.2.1.1, 13.7.1.1 and 13.12.1.5.1. The manual has no women's wrestling exception to them.",
    sources: ["d1Manual", "d1Cabinet"],
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
          "At any time you may email coaches your results, video and graduation year, research schools and attend camps.",
        ],
        advice: "No rule stops you filling out a college's recruiting questionnaire at any age. Do it early: it puts you in the program's database before a coach is allowed to answer.",
        rule: "Bylaws 13.9.3.1 (written offers), 13.6.2.2 and 13.6.3 (official visits), 13.7.2 (unofficial visits)",
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
        rule: "Bylaws 13.02.5.5, 13.02.5.6, 13.17.14.1.4 and 13.17.14.2",
        sources: ["d1Calendar", "d1Manual"],
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
          "What you sign is the school's written athletics aid agreement, and at some schools a benefits agreement with it. The 2026-27 Division I Manual has no National Letter of Intent.",
          "The first signing date for wrestling is the second Wednesday in November at 7 a.m.: November 11, 2026.",
          "Once you sign, other NCAA scholarship schools must stop recruiting you. You may sign with one school only.",
        ],
        rule: "Bylaws 13.02.13.1 and 13.1.1.2",
        sources: ["d1Manual", "cbsa"],
      },
      {
        heading: "Scholarships and roster spots",
        intro:
          "A wrestling scholarship may be full or partial, in any amount the school chooses.",
        bullets: [
          "At schools that opted in to the House settlement (every ACC, Big Ten, Big 12, Pac-12 and SEC member, plus any school that chose to), the roster limit is 30 for men's wrestling and 30 for women's. There is no cap on scholarships within that roster.",
          "At Division I schools that did not opt in, there is no national roster limit. The manual no longer sets a scholarship limit for any program, but a school that awards more than its 2024-25 limit comes under the settlement and its roster limit.",
        ],
        advice: "With a limit of 30, an invitation to walk on is not a roster spot. Ask the coach to confirm the spot in writing, and ask whether the college opted in.",
        rule: "Bylaws 17.2 (roster limits) and 16.13.1.5; House settlement question and answer A1, A11, A16, B2, B3",
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
        ],
        advice: "Those windows open months after high school seniors can first sign in November, and coaches use them to fill roster spots. Ask a coach how many spots are being held for transfers.",
        rule: "Bylaw 13.1.1.3 and Figure 13-1",
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
          { label: "In-person contact, on or off campus", value: "June 15 immediately before junior year" },
          { label: "Official (paid) visit", value: "June 15 immediately before junior year; one per school, 48 hours at most" },
          { label: "On-campus tryout", value: "June 15 immediately before junior year; one per school while you are in high school, two hours at most, and in men's and women's wrestling it may not include competition" },
          { label: "Unofficial visits", value: "Unlimited, except during the signing dead period. A coach cannot meet with you in person on one before June 15 before junior year." },
        ],
        bullets: [
          "Before an official visit you must be registered with the NCAA Eligibility Center, be on the school's request list and have sent a transcript.",
          "A tryout needs a medical exam first, including a sickle cell test.",
        ],
        rule: "Bylaws 13.1.1.1, 13.1.3.1, 13.3.1 to 13.3.3, 13.4.1 and 13.8.2.1",
        sources: ["d2Manual", "d2Guide"],
      },
      {
        heading: "2026-27 calendar and signing",
        rows: [
          { label: "Dead period", value: "November 9, 7 a.m. to November 11, 7 a.m., 2026: no in-person contact, no visits, and coaches may not watch you compete. Calls and messages are still allowed." },
          { label: "First signing date", value: "Wednesday, November 11, 2026 (the second Wednesday in November)" },
        ],
        bullets: [
          "Division II wrestlers sign the school's athletics aid agreement. The signing rules were rewritten on October 22, 2024.",
          "An offer may be made in writing earlier, but it cannot be signed before the signing date.",
        ],
        rule: "Bylaws 13.02.10.1 and 13.6.4",
        sources: ["d2Calendar", "d2Manual"],
      },
      {
        heading: "Scholarships",
        intro: "The limit is on the total value of the awards, which a coach divides among the team.",
        rows: [
          { label: "Men's wrestling", value: "Up to 9.0 scholarships' worth" },
          { label: "Women's wrestling", value: "Up to 10.0 scholarships' worth" },
        ],
        rule: "Bylaws 15.4.2.1.1 and 15.4.2.1.2",
        sources: ["d2Manual"],
      },
      {
        heading: "Academic standard",
        rows: [
          { label: "Core courses", value: "16: 3 English, 2 math (Algebra I or higher), 2 science, 3 more English, math or science, 2 social science, 4 additional" },
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
          { label: "Tryouts", value: "Not allowed" },
        ],
        rule: "Bylaws 13.02.10.1, 13.1.1.1, 13.4.1.1, 13.6.1, 13.6.2, 13.7.1 and 13.11.2.1",
        sources: ["d3Manual"],
      },
      {
        heading: "Money and signing",
        bullets: [
          "Division III schools give no athletic scholarships. Aid cannot be based on wrestling; it is whatever the school offers any student, need-based or merit, on the same terms.",
          "There is no letter of intent. A school may offer a non-binding celebratory signing form once you have been admitted. It cannot be signed on campus or with college staff present.",
          "Division III has no recruiting calendar: no dead periods or shutdowns.",
        ],
        rule: "Bylaws 15.01.3, 15.01.4 and 13.9.1",
        sources: ["d3Manual", "cbsa"],
      },
      {
        heading: "Academic standard",
        bullets: [
          "There is no NCAA academic certification for Division III. Each college sets its own admission and eligibility standards.",
          "A US student headed to a Division III school needs only an Eligibility Center Profile Page, which carries no fee. An international student needs a paid Athletics Certification account ($85).",
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
          "The NAIA has no recruiting calendar and sets no date or grade at which a coach may first call or write. In its words, there are \"no recruiting calendar restrictions of any kind\".",
          "Its only contact limits protect athletes already enrolled at, or who have started practice with, another NAIA school.",
          "Tryouts are allowed where the college uses them for other talented students too: no more than two days for one student at one school.",
          "A school may pay for your visit only if it does the same for other specially talented students.",
        ],
        reading: "On tryouts the NAIA's own documents differ: the bylaw says two days per student per school, while its student guide says two days in a whole career. We give the bylaw. Ask the coach which the college follows.",
        rule: "NAIA Bylaws Article II, Sections C and D",
        sources: ["naiaHs", "naiaHandbook", "naiaGuide"],
      },
      {
        heading: "Eligibility",
        intro: "Register with the NAIA Eligibility Center at PlayNAIA. It is separate from the NCAA's.",
        rows: [
          { label: "Registration fee", value: "$110 for a US or Canadian high school student; $170 international. US students with demonstrated need (an ACT or SAT fee waiver, or free or reduced-price lunch) can have it waived; your counselor confirms it." },
          { label: "The rule", value: "Graduate from high school with a 2.3 GPA or better" },
          { label: "Or meet two of these three", value: "18 on the ACT or 970 on the SAT in one sitting; a 2.0 GPA; top half of your class" },
        ],
        rule: "NAIA Bylaws Article V, Section C",
        sources: ["naiaGuide", "naiaHandbook"],
      },
      {
        heading: "Scholarships and signing",
        bullets: [
          "The NAIA's 2026-27 handbook sets the limit for wrestling at the equivalent of 10 full grants of the college's aid, athletic and academic combined, across varsity wrestlers. Strong students can be partly or fully exempt from the count.",
          "Men's wrestling and women's wrestling are two separate NAIA programs, each with its own championship and its own limit of 10. A college with both has 10 for each.",
          "There is no association-wide letter of intent. You may sign with a school, but the NAIA does not oblige you to attend. Some NAIA conferences do make their members honor a letter signed with another school in the same conference, so ask.",
          "The NAIA permits name, image and likeness deals. Tell the athletics director in writing about any deal that refers to the college or to you as one of its wrestlers.",
        ],
        rule: "NAIA Council of Presidents Policy XIII (upper limits for institutional aid); Bylaws Article VII, Section B",
        sources: ["naiaHandbook", "naiaGuide"],
      },
    ],
  },
  {
    slug: "njcaa",
    title: "NJCAA (junior college)",
    summary: "Junior college. Paid visits from June 1 before junior year; signing opens November 1.",
    free: false,
    sections: [
      {
        heading: "Visits and signing",
        rows: [
          { label: "Official (paid) visit", value: "From June 1 before junior year; one per school each year, 48 hours at most, expenses for you and two guests" },
          { label: "Earliest signing date, wrestling", value: "November 1" },
          { label: "To sign", value: "You must have finished junior year" },
          { label: "The letter of intent", value: "Runs one academic year, August 1 to July 31. Once you sign, no other NJCAA school may contact you, and signing a second NJCAA letter without a release costs a year of eligibility." },
        ],
        bullets: [
          "The NJCAA sets no date before which a coach may call, message or visit a high school wrestler. Its contact limits protect only wrestlers who are in season at, or signed with, another NJCAA school.",
          "A workout for the coach is allowed only after junior year: two hours, once a year.",
        ],
        reading: "The November 1 date and the signee limits come from the NJCAA's 2026-27 procedures chart, which the NJCAA marks as tentative and subject to change.",
        rule: "NJCAA Bylaws Article VI, Sections 3, 4 and 5",
        sources: ["njcaaBylaws", "njcaaChart"],
      },
      {
        heading: "Scholarships",
        rows: [
          { label: "Men's wrestling", value: "Up to 20 signees, whatever the size of each award" },
          { label: "Women's wrestling", value: "Up to 22 signees, whatever the size of each award" },
          { label: "NJCAA Division I programs", value: "May cover tuition, fees, room and board, books, up to $250 in supplies and one round trip a year" },
          { label: "NJCAA Division II programs", value: "May cover tuition, fees, books and up to $250 in supplies; no room and board, no travel" },
          { label: "NJCAA Division III programs", value: "No athletic aid" },
        ],
        rule: "NJCAA Bylaws Article VI, Section 2",
        sources: ["njcaaChart", "njcaaBylaws"],
      },
      {
        heading: "Eligibility",
        bullets: [
          "The entrance requirement is a high school diploma or its equivalent. There is no minimum high school GPA, core-course list or test score.",
          "Once enrolled you must be a full-time student, stay an amateur and keep up the credits and 2.00 GPA the NJCAA requires term by term. A first-term freshman has no GPA requirement.",
        ],
        rule: "NJCAA Bylaws Article V, Sections 2 and 4",
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
        // Matt, 19 Oct 2026: the page started on accounts without saying what the Eligibility Center is.
        heading: "What the Eligibility Center is",
        intro:
          "The NCAA Eligibility Center is the NCAA office that decides whether a high school student can compete as a college freshman at a Division I or Division II school. It checks two things: academics, from the core courses and core-course GPA on the official transcripts your high school sends, and amateurism, that the wrestler has not been paid to compete or signed with an agent or a professional team. Until a wrestler has the right account, a Division I or II college cannot host an official visit, sign them or let them compete, and the final decision comes after high school graduation, once the final transcript and proof of graduation arrive.",
        bullets: [
          "Division III does not certify academics: a US student headed there needs only the free Profile Page.",
          "The NAIA has its own eligibility center, with its own rule. Junior colleges do not use one.",
        ],
        sources: ["cbsa", "ecFaq"],
      },
      {
        heading: "Which account",
        rows: [
          { label: "Profile Page (no fee)", value: "If you are undecided, or a US student headed to a Division III school" },
          { label: "Academic and Athletics Certification account", value: "If a Division I or II school is recruiting you. Required for Division I and II official visits, for signing and for competing." },
          { label: "Fee for the certification account", value: "$120 for a US student; $180 international. Not refundable after 30 days." },
        ],
        bullets: [
          "The NCAA's guide says to register before ninth grade, and move to a certification account in tenth grade if a Division I or II school is recruiting you.",
          "Walk-ons must register too.",
          "A fee waiver goes through your high school counselor. You qualify if, among other grounds, you are eligible for an SAT or ACT fee waiver or for free or reduced-price lunch.",
        ],
        reading: "The fee is shown on the Eligibility Center's registration pages, not in the NCAA's printed guide. We read it there on the checked date; confirm the amount when you register.",
        sources: ["cbsa", "ecRegister", "ecFaq"],
      },
      {
        heading: "What the Eligibility Center reviews",
        intro: "The NCAA lists these among the things it looks at before certifying a wrestler as an amateur.",
        bullets: [
          "Signing a contract with a professional team, or a written agreement with an agent.",
          "Being paid, or given preferential treatment or benefits, for competing.",
          "Prize money, and tryouts or practice with a professional team.",
        ],
        sources: ["cbsa"],
      },
      {
        heading: "Waiting to enrol: the rule changed",
        bullets: [
          "Division I and II now use an age-based rule. You have five years of eligibility, and the clock starts when you first enrol full time or at the start of the academic year after your 19th birthday, whichever comes first. It does not pause.",
          "For a wrestler enrolling in fall 2027 or later, that is the only rule. One enrolling during 2026-27 gets whichever of the old and new rules is better for that wrestler.",
          "Division III keeps the older rule: a 12-month grace period after high school graduation.",
        ],
        reading: "The NCAA adopted this in 2026 and its printed guide still describes the older grace-period rule, with a note to read the age-based rules. If you are planning a year off before college, confirm how it applies to you with the college's compliance office.",
        sources: ["ageRule", "cbsa"],
      },
    ],
  },
  {
    slug: "questions-families-ask",
    title: "Questions families ask",
    summary: "Who pays for a visit and whether parents go, what NIL and revenue sharing are, whether results earn more money, a grant against a scholarship, and how the Ivy League works.",
    free: false,
    sections: [
      {
        heading: "Who pays for a recruiting visit?",
        intro:
          "It depends on the kind of visit. An official visit is one the college pays for. An unofficial visit is one your family pays for, and you may take as many as you like.",
        rows: [
          { label: "Division I official visit", value: "Travel for the wrestler and up to two family members; lodging and up to three meals a day for the wrestler and up to four family members; two nights at most" },
          { label: "Division II official visit", value: "The wrestler's round-trip travel and lodging, and meals for the wrestler and those travelling along; 48 hours at most. The rules do not provide for the family's airfare, but if a parent drives the wrestler the college may pay the mileage." },
          { label: "Division III official visit", value: "The wrestler's round-trip travel and lodging, and meals for the wrestler and those travelling along; 48 hours at most. The college may not pay the family's travel, apart from mileage if you drive together and a ride from the airport." },
          { label: "Junior college official visit", value: "The actual costs for the wrestler and two guests; 48 hours at most" },
          { label: "NAIA visit", value: "No set list. A college may pay only if it does the same for other specially talented students it recruits." },
          { label: "Any unofficial visit", value: "Your family pays for travel, hotel and food. Division II and III colleges may give you one meal on campus; Division I may not." },
        ],
        bullets: [
          "Flights paid by a Division I college must be commercial, in coach.",
          "A college may pay for one official visit per wrestler. You may take official visits to as many colleges as invite you.",
        ],
        rule: "Division I Bylaws 13.5.2.6, 13.6.4, 13.6.6 and 13.6.7.7; Division II Bylaws 13.3.3 to 13.3.5; Division III Bylaws 13.5.2, 13.6.2 and 13.6.4; NJCAA Bylaws Article VI, Section 4; NAIA Bylaws Article II, Section C",
        sources: ["d1Manual", "d2Manual", "d3Manual", "cbsa", "njcaaBylaws", "naiaHandbook"],
      },
      {
        heading: "Do parents go on the visit?",
        bullets: [
          "The rules expect it. Division I lets the college pay travel for two family members and lodging and meals for up to four. Division II and III cover meals for those who come with the wrestler.",
          "Family members beyond those numbers may come at their own cost.",
        ],
        advice: "Go, at least one parent, on every official visit. You will hear the coach describe the roster spot and the money, see where your wrestler would live and train, and meet the people who would look after your wrestler. Let the wrestler do the talking with the coach, and save your questions about cost for the meeting where aid is discussed.",
        rule: "Division I Bylaws 13.5.2.6 and 13.6.6",
        sources: ["d1Manual", "cbsa"],
      },
      {
        heading: "What is NIL?",
        intro: "Name, image and likeness: a wrestler being paid by a business or other third party for the use of the wrestler's name, picture or reputation.",
        bullets: [
          "The NCAA's examples are social media posts, brand appearances, and promoting products and services.",
          "It must be payment for something done, such as a post or an appearance. It may not be pay for wrestling or for results, and it may not be used to get a wrestler to enrol at or stay at a particular college.",
          "All three NCAA divisions allow it. So does the NAIA.",
          "In high school the rules are North Carolina's, not the NCAA's, and they are strict about the steps.",
        ],
        rule: "NCAA Division I and III Bylaw 22.01.1; NAIA Bylaws Article VII, Section B",
        sources: ["cbsa", "d1Manual", "d3Manual", "naiaHandbook", "ncNil"],
      },
      {
        heading: "What is revenue sharing?",
        intro: "Money a Division I college pays directly to its athletes, which became possible with the House settlement. It is separate from a scholarship and separate from NIL deals with outside businesses.",
        bullets: [
          "Each Division I college decides whether to do it and how much to pay, up to a cap on the total across all of its teams. The cap was $20.5 million per college for 2025-26.",
          "A college that takes part comes under the settlement's other terms, including the roster limit of 30 for men's wrestling and 30 for women's.",
          "A college may not put a revenue-share offer in writing before August 1 of a wrestler's senior year.",
        ],
        advice: "A cap is not a promise. Ask the coach whether wrestlers at that college receive any revenue share, and get any figure in the written offer.",
        rule: "House settlement question and answer A1, A3, B11, D2 and D3; Division I Bylaws 13.9.3.1 and 17.2",
        sources: ["houseQa", "d1Manual"],
      },
      {
        heading: "Can a wrestler earn more by wrestling well? Is that agreed up front?",
        intro: "A scholarship can go up later, but a bonus for results cannot be written into it. What is agreed up front is the starting offer.",
        bullets: [
          "A scholarship may be raised at any time, for any reason, in Division I and Division II. A coach can reward a wrestler who has earned it; nothing obliges a coach to.",
          "It may not be cut during the period of the award because of how a wrestler performs, or because of an injury.",
          "A Division I college may not write an athletic condition into a scholarship, such as aid that depends on a set level of performance, that would let it cut the award.",
          "In Division I, for a wrestler who has athletic aid in the first year, performance and injury also may not be used to reduce it or decline to renew it in later years.",
          "NIL deals with outside businesses may not be pay for wrestling or for results.",
          "A revenue-share or NIL agreement with a Division I college itself is negotiated. The NCAA says the college and the wrestler have discretion over its terms, and gives a payment tied to keeping a 3.0 GPA as an example. The wrestler may have a parent, guardian or lawyer present when it is negotiated.",
        ],
        advice: "Negotiate the first-year number, because that is the one in writing. Then ask the coach how awards on the team have changed over a career: what wrestlers who started where yours would start are receiving as juniors. A coach's record of raising awards tells you more than a promise.",
        rule: "NCAA Division I Bylaws 15.3.4.2, 15.3.4.2.1, 15.3.4.3, 15.3.5 and 22.01.1; Division II Bylaws 15.5.4.2 and 15.5.4.3; House settlement question and answer D24",
        sources: ["d1Manual", "d2Manual", "houseQa"],
      },
      {
        heading: "Do Division III wrestlers get NIL?",
        bullets: [
          "Yes. Division III has no athletic scholarships, but its wrestlers may be paid for the use of their name, image and likeness like anyone else in the NCAA.",
          "The same limits apply: it must be for something done, not for wrestling, and it may not be used to get a wrestler to enrol.",
        ],
        rule: "NCAA Division III Bylaws 22.01.1 and 22.01.2",
        sources: ["d3Manual", "cbsa"],
      },
      {
        heading: "What is the difference between a grant and a scholarship?",
        bullets: [
          "\"Grant-in-aid\" is the NCAA's own term for an athletic scholarship. A coach who offers a grant-in-aid and a coach who offers a wrestling scholarship mean the same thing: money from the athletics department, written into an athletics aid agreement.",
          "A need-based grant is different. It comes from the college's financial aid office, is based on your family's finances, and has nothing to do with wrestling.",
          "An academic or merit scholarship is based on grades and comes from admissions or financial aid.",
          "At Division III colleges and in the Ivy League there is no athletic money at all, so everything a wrestler receives is one of the last two.",
        ],
        advice: "Ask for the whole package in one place: athletic aid, academic aid and need-based aid, each as a yearly dollar figure, and for how many years. Compare colleges on what your family will pay, not on the size of the scholarship.",
        rule: "NCAA Division I Bylaw 13.9.3.1; Division III Bylaws 15.01.3 and 15.01.4",
        sources: ["d1Manual", "d3Manual", "cbsa"],
      },
      {
        heading: "How does the Ivy League work?",
        intro: "The Ivy League colleges are in NCAA Division I, so the Division I contact and visit dates apply. The money and the admissions process are their own.",
        bullets: [
          "There are no athletic scholarships and no academic scholarships. Aid is given only on financial need, as each college's financial aid office works it out.",
          "A coach may ask the financial aid office for an estimate for a recruit. Only that office can decide the package.",
          "You may share one Ivy college's written estimate with another, and the second may adjust its own.",
          "An admissions office may send a \"likely letter\" to a recruit whose application is complete. It may not be sent before October 1 of senior year, and only admissions can issue it.",
          "Six Ivy League colleges are on our map with wrestling: Brown, Columbia, Cornell, Harvard, Penn and Princeton.",
        ],
        sources: ["ivy"],
      },
    ],
  },
  {
    slug: "paying-for-college",
    title: "Paying for college: the whole picture",
    summary: "How common a full ride really is, how academics change the price, need-based aid, and how to compare offers on what your family will actually pay.",
    free: false,
    sections: [
      {
        heading: "How common is a full ride?",
        intro:
          "Rare. No governing body publishes how many wrestlers are on a full athletic scholarship, and we do not hold award data, so there is no honest percentage to give. What the rules themselves show is that the money is built to be shared.",
        rows: [
          { label: "NCAA Division I", value: "At colleges in the House settlement, up to 30 wrestlers and no limit on scholarships within that. An award may be full or partial, in any amount." },
          { label: "NCAA Division II", value: "A whole team is limited to the equivalent of 9 full grants for men's wrestling and 10 for women's. The NCAA calls it a \"partial athletics scholarship model\"." },
          { label: "NCAA Division III and the Ivy League", value: "No athletic scholarships at all" },
          { label: "NAIA", value: "A whole team is limited to the equivalent of 10 full grants of the college's aid" },
          { label: "Junior college", value: "Up to 20 signees for men's wrestling and 22 for women's, of any size. NJCAA Division I programs may cover tuition, fees, room and board." },
        ],
        bullets: [
          "Across all teams, the NCAA says 70% of Division I athletes and 77% of Division II athletes receive some athletic aid. Some is not all.",
          "In Division III, 80% of athletes receive aid that has nothing to do with athletics.",
          "A full grant, in the NCAA's definition, is tuition and fees plus food and housing.",
        ],
        reading:
          "The arithmetic, as an illustration only: nine full grants shared across a team of 30 wrestlers averages less than a third of a full grant each. Teams differ in size and coaches do not split evenly, so use it to set expectations, not to predict an offer.",
        advice: "Expect a partial offer. The lowest bills usually come from combining a partial wrestling award with academic and need-based aid, which is why the rest of this page matters more than the scholarship number.",
        rule: "NCAA Division II Bylaws 15.02.6, 15.4.2.1 and 15.4.2.2; NAIA Council of Presidents Policy XIII; NCAA Division I Bylaws 17.2 and 16.13.1.5",
        sources: ["d2Manual", "naiaHandbook", "d1Manual", "houseQa", "njcaaChart", "cbsa"],
      },
      {
        heading: "How academics change the price",
        intro: "Academics do two jobs. A strong academic record can earn aid of its own, and at some levels it lets a coach give a wrestler more.",
        bullets: [
          "Colleges award their own academic scholarships, usually on GPA and test scores. The NCAA notes that many athletes also benefit from academic scholarships and need-based aid such as federal Pell Grants.",
          "NAIA: a strong student costs the coach less of the team's limit. For an entering freshman with a 3.75 high school GPA, a 1280 SAT or 27 ACT, or a place in the top 10% of the class, none of that wrestler's aid counts against the team's 10. With a 3.50 to 3.74 GPA, a 1140 SAT or 23 ACT, or the top 11% to 25%, only half counts.",
          "NCAA Division II: only athletic aid counts against the team's limit. Academic aid from the college that does not depend on wrestling sits on top of it.",
          "NCAA Division III and the Ivy League: there is no athletic money, so the academic record and financial need are the whole package. In the Ivy League it is need alone.",
          "Academics also decide whether a wrestler can compete at all: a 2.3 core-course GPA for Division I and 2.2 for Division II.",
        ],
        advice: "Treat the GPA as part of the recruiting profile. Ask each college's admissions office what GPA and test score earn each level of academic scholarship; many publish a table. A wrestler a coach can fund partly with academic money is easier to say yes to.",
        rule: "NAIA Council of Presidents Policy XIII, Section G (academic exemption); NCAA Division II Bylaws 15.02.2, 15.4.1.7 and 15.4.2.2; Division III Bylaw 15.01.3",
        sources: ["naiaHandbook", "d2Manual", "d3Manual", "cbsa", "ivy"],
      },
      {
        heading: "Need-based financial aid",
        bullets: [
          "Need-based aid comes from the college's financial aid office and the government, based on your family's finances. It starts with the federal FAFSA form.",
          "Net price is what a student pays for one year after scholarships and grants are subtracted. Scholarships and grants do not have to be paid back; loans do.",
          "Each college's page in this portal shows what a year costs: tuition and fees, housing and food, and books, at the in-state or out-of-state rate a North Carolina family is charged. It is the newest published price, a year or two behind today's, and before any aid.",
          "Every college has a net price calculator on its website, where you enter your own details and see what students like yours paid. The Department of Education keeps a search for them.",
          "A wrestler must report all financial aid received to the college's financial aid office.",
        ],
        advice: "Run the net price calculator for every college on your list before you visit. It takes ten minutes, and it can show that a college with a high sticker price costs your family less than a cheaper-looking one.",
        sources: ["netPrice", "fafsa", "cbsa"],
      },
      {
        heading: "What an athletic scholarship covers, and for how long",
        bullets: [
          "It can cover some or all of tuition and fees, food and housing, and books. Read the agreement to see which, and what you are left to pay.",
          "In Division I, athletic aid is awarded for at least one academic year and may run for more, up to the wrestler's five years of eligibility. It may be a one-year or a multi-year award.",
          "In many cases the head coach decides who is offered a scholarship and whether it is renewed.",
          "If a college plans to reduce, cancel or not renew it, the college must tell the wrestler in writing by July 1 and explain how to appeal.",
        ],
        advice: "Before signing, ask three things and get the answers in writing: how many years, what happens to the award after an injury, and what would cause it to be reduced.",
        rule: "NCAA Division I Bylaw 15.3.3.1",
        sources: ["cbsa", "d1Manual"],
      },
      {
        heading: "Comparing offers",
        intro: "This is our way of doing it, not a rule.",
        bullets: [
          "Start with each college's full yearly cost of attendance: tuition, fees, housing, food, books and travel home.",
          "Subtract, as yearly dollar figures, the wrestling award, the academic award, need-based grants, and any revenue share that is in the written offer.",
          "What is left is what your family pays or borrows. Multiply it by four, and ask which parts are guaranteed beyond the first year.",
          "Compare colleges on that number. A 25% wrestling scholarship at one college can cost a family more than no wrestling money at another.",
        ],
        sources: ["netPrice", "cbsa"],
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
          "A wrestler at an NCHSAA member school may not take part in high school athletics after receiving payment as a participant in an athletic contest.",
          "The exception for prizes is a gift, merchandise or other item worth $250 or less per student per season, that is either totally consumable and non-transferable or permanently labelled (engraved or monogrammed), and approved by the principal and the local superintendent. It is an item, not cash.",
          "These do not cost eligibility: meals, lodging and travel paid by the school, the association or a booster club; a normal fee for instructing, supervising or officiating; and a US Olympic Operation Gold grant.",
          "Signing a professional contract ends a wrestler's high school wrestling eligibility. So does competing in an all-star event the NCHSAA has not sanctioned, meaning one that charges admission and draws its teams from two or more regular teams.",
          "The rule is enforced from the day a student first enters ninth grade.",
          "For the NCAA, the prize money must come from the event's sponsor, and the Eligibility Center still reviews it.",
        ],
        reading:
          "The NCHSAA rule says \"an athletic contest\", which on its face includes tournaments outside the school season. The handbook has no sentence about prize money at an open tournament by name. Before a wrestler accepts any cash prize, ask the school's athletic director.",
        rule: "NCHSAA Handbook Rule 1.2.11 (State Board policy ATHL-007); NCAA Division I Bylaw 12.1.2.4.1",
        sources: ["nchsaa", "d1Manual", "cbsa"],
      },
      {
        heading: "Name, image and likeness (NIL) at NCHSAA member schools",
        intro: "It is allowed, under a state rule the NCHSAA enforces at every member school. Skipping a step makes the student ineligible.",
        bullets: [
          "The pay may not depend on athletic performance.",
          "If the student is under 18, a parent must be a party to the agreement.",
          "The student gives the school's administrators a complete, unredacted copy of the proposed agreement at least 10 business days before signing, and the signed copy within 5 business days after. The same applies to any amendment.",
          "The student, and a parent if the student is a minor, completes the NFHS NIL course at least 10 business days before signing and gives the school the certificate.",
          "The agreement must hold the school system, the NCHSAA and the State Board harmless.",
          "No reference to a school, school system, conference or the NCHSAA, and none of their names, uniforms, logos, marks or mascots. No promoting the sponsor, or wearing its apparel, at school competition or other school events.",
          "Not allowed at all: adult establishments or adult entertainment; alcohol; tobacco, vaping and other nicotine products; cannabis; controlled substances; opioids or prescription drugs; weapons, firearms or ammunition; casinos, gambling or betting; and anything that would disrupt the operations of a school.",
          "Athletic directors, coaches, other school employees, booster club and collective representatives may not use NIL to recruit a student to a school, act as a student's agent, or help arrange a deal.",
        ],
        rule: "16 NCAC 06E .0211 (State Board policy ATHL-008); NCHSAA Handbook Rules 1.2.11 and 1.2.13",
        sources: ["ncNil", "nchsaa"],
      },
      {
        heading: "Private schools (NCISAA)",
        intro: "Independent schools in the NCISAA follow different rules from the ones above.",
        bullets: [
          "NIL is allowed, provided it stays separate from school athletics. The school and parents must submit the NCISAA's NIL approval form and have the State Office's approval before the student competes.",
          "No reference to the school or the NCISAA, and no school jersey, name, mascot or logo. Collectives are prohibited.",
          "The NCISAA's rules contain no prize-money rule. Its one statement defines an amateur as a student who has not used athletic skill \"for financial gain\".",
        ],
        reading: "Because the NCISAA sets no dollar limit and no approval step for prizes, ask the NCISAA State Office before a private school wrestler accepts prize money. Two versions of its NIL policy are posted; we cite the one its 2026-27 rules link to.",
        sources: ["ncisaaRules", "ncisaaNil"],
      },
      {
        heading: "What about college?",
        bullets: [
          "A Division I school cannot put an NIL or revenue-share offer in writing before August 1 of senior year.",
          "That written offer cannot be signed before the signing date.",
          "The NCAA's own advice to high school wrestlers on NIL is to check with the state athletic association: here, the NCHSAA.",
        ],
        rule: "NCAA Division I Bylaw 13.9.3.1; House settlement question and answer B11",
        sources: ["houseQa", "d1Manual", "cbsa"],
      },
    ],
  },
]

/**
 * Where the rules for men's and women's wrestling differ, level by level (Matt, 13 Oct 2026:
 * "if there are differences in rules for women's vs men's ... separate or call out").
 *
 * They are two programs under two sets of exceptions, and a family reading the men's dates for a
 * daughter gets the wrong year. So every level page opens with this: what differs, side by side,
 * and what is the same. A page with no differences says so, rather than leaving a family to
 * wonder whether we checked. A test requires an entry for every level.
 *
 * Found by reading every bylaw in the 2026-27 manuals that names men's or women's wrestling.
 */
export type GenderDifference = { topic: string; mens: string; womens: string }

export type GenderComparison = {
  differences: GenderDifference[]
  /** Checked, and the same for both. */
  same: string[]
  note?: string
  sources: SourceKey[]
}

export const MENS_AND_WOMENS: Record<string, GenderComparison> = {
  "division-1": {
    differences: [
      { topic: "A coach may first call, text or email", mens: "Class of 2028 and later: April 1 of junior year. Class of 2027: June 15 at the end of sophomore year.", womens: "June 15 at the end of sophomore year" },
      { topic: "A coach may first meet you off campus", mens: "Class of 2028 and later: June 15 at the end of junior year. Class of 2027: August 1 at the start of junior year.", womens: "August 1 at the start of junior year" },
      { topic: "First official and unofficial visits", mens: "Class of 2028 and later: August 15 of senior year. Class of 2027: August 1 of junior year.", womens: "August 1 of junior year" },
      { topic: "Recruiting shutdowns in 2026-27 (no contact of any kind)", mens: "December 24-26 and March 16-21", womens: "None" },
      { topic: "Window for a college wrestler to give notice of transfer", mens: "April 1 to April 30", womens: "February 28 to April 13, 2027" },
      { topic: "National championship", mens: "The NCAA Division I Wrestling Championships", womens: "One National Collegiate Championship, shared by every NCAA division" },
    ],
    same: ["The roster limit of 30 at colleges in the House settlement", "The signing date and what is signed", "The dead periods in signing week and NWCA Convention week", "The academic standard"],
    sources: ["d1Manual", "d1Calendar"],
  },
  "division-2": {
    differences: [
      { topic: "Scholarship limit for the whole team", mens: "The equivalent of 9 full grants", womens: "The equivalent of 10 full grants" },
      { topic: "National championship", mens: "The NCAA Division II Men's Wrestling Championship", womens: "One National Collegiate Championship, shared by every NCAA division" },
    ],
    same: ["When a coach may call, write and meet you", "Official visits and tryouts, including the rule that a wrestling tryout may not include competition", "The signing date and the dead period before it", "The academic standard"],
    sources: ["d2Manual"],
  },
  "division-3": {
    differences: [
      { topic: "National championship", mens: "A Division III championship of its own", womens: "One National Collegiate Championship, shared by every NCAA division" },
    ],
    same: ["When a coach may call, write and meet you", "Official and unofficial visits", "No athletic scholarships and no letter of intent", "No tryouts"],
    note: "The Division III manual lists the shared women's championship as covering Divisions I and II from August 1, 2027, which points to Division III women getting a championship of their own. Ask a Division III coach how her team qualifies in the year you would enrol.",
    sources: ["d3Manual"],
  },
  naia: {
    differences: [],
    same: ["No recruiting calendar and no first-contact date", "Tryouts and visits", "The eligibility rule", "The limit of 10 full grants, which each team has separately"],
    note: "Men's and women's wrestling are separate NAIA teams with separate championships, under the same rules.",
    sources: ["naiaHandbook", "naiaGuide"],
  },
  njcaa: {
    differences: [{ topic: "Scholarship signees allowed", mens: "20", womens: "22" }],
    same: ["Official visits", "The November 1 signing date", "What each NJCAA division's scholarship may cover", "Eligibility"],
    sources: ["njcaaChart", "njcaaBylaws"],
  },
}

/** The anchor for a section, so a question can be linked to directly. */
export const sectionId = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export const learnPage = (slug: string) => LEARN_PAGES.find((page) => page.slug === slug) ?? null
