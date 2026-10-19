import programData from "@/lib/college-programs/programs-2026-27.json"
import { COLLEGE_DIVISIONS, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
/**
 * Women's wrestling: the college pathway (Matt, 19 Oct 2026). One guide, not a second Command
 * Center: the Command Center already follows the wrestler (women's map, dates, tournaments,
 * rankings). Built from Matt's outline, every outside fact checked on 19 Oct 2026; the program
 * counts, the nearby colleges and where North Carolina girls went are computed from our own data
 * on the page (app/recruiting/learn/womens-wrestling), so they never go stale.
 *
 * Left out as unconfirmed: a 30-wrestler roster cap for women's wrestling (no source applies the
 * men's figure to women), the "46 states" count (an advocacy group's 2024 figure; the NFHS's own
 * 2025-26 count, 40 state associations holding championships, replaced it 19 Oct 2026), the
 * 1,738 NCAA participants a statistics page attributes to the NCAA (not found in its report),
 * NJCAA's first championship year, and Title IX claims about why colleges add the sport.
 */

export const WOMENS_CHECKED = "2026-10-19"

export type WSource = { label: string; url: string }

const S = {
  nfhs: { label: "NFHS: 2024-25 participation survey", url: "https://nfhs.org/stories/participation-in-high-school-sports-hits-record-high-with-sizable-increase-in-2024-25" },
  nfhs26: { label: "NWCA: 2025-26 participation, led by girls wrestling", url: "https://nwcaonline.com/news/2026/8/31/national-wrestling-coaches-association-led-by-girls-flag-football-and-girls-wrestling-high-school-sports-participation-increases-for-fifth-consecutive-year.aspx" },
  ncaa91: { label: "NCAA.com: women's wrestling becomes the 91st championship", url: "https://www.ncaa.com/news/wrestling-women/article/2025-01-17/ncaa-adds-womens-wrestling-91st-championship" },
  ncaaFirst: { label: "NCAA.com: McKendree claims the first NCAA women's championship", url: "https://www.ncaa.com/news/wrestling-women/article/2026-03-07/history-made-mckendree-claims-first-ncaa-womens-wrestling-championship-tops" },
  d3Own: { label: "NCAA: Division III establishes its own women's championship", url: "https://www.ncaa.org/news/2026/1/16/media-center-division-iii-delegates-approve-establishment-of-diii-womens-wrestling-championships.aspx" },
  naiaFirst: { label: "Avila Athletics: the first NAIA women's championships, March 2023", url: "https://avilaathletics.com/sports/wwrest/2022-23/releases/20230312_Avila_Competes_at_First_NAIA_Womens_Wrestling_Championships" },
  naiaInvite: { label: "Campbellsville: the first NAIA women's invitational, 2019", url: "https://campbellsvilletigers.com/news/2019/3/18/womens-wrestling-rivera-claims-first-naia-national-championship-lady-tiger-wrestling-places-fourth.aspx" },
  iowa: { label: "Just Women's Sports: Iowa becomes the first Power 5 school to add women's wrestling", url: "https://justwomenssports.com/reads/iowa-becomes-first-power-5-school-to-add-womens-wrestling" },
  nchsaa: { label: "NCHSAA: the 2024 championships and the first women's champion", url: "https://www.nchsaa.org/2024-individual-wrestling-championships/" },
  fitch: { label: "WBTV: the first girl to win a North Carolina state title, 2020", url: "https://www.wbtv.com/2020/02/27/watch-crowd-chant-wrestlers-name-she-becomes-first-girl-win-state-title-nc/" },
} satisfies Record<string, WSource>

/** High school girls wrestling, NFHS. The ten-years-earlier figure is the NFHS's own comparison. */
export const PARTICIPATION: Array<{ year: string; girls: number }> = [
  { year: "2014-15", girls: 11_496 },
  { year: "2024-25", girls: 74_064 },
  { year: "2025-26", girls: 88_771 },
]
export const PARTICIPATION_SOURCES = [S.nfhs, S.nfhs26]

export const WOMENS_HISTORY: Array<{ when: string; what: string; sources?: WSource[] }> = [
  { when: "2004", what: "Women's freestyle wrestling is added to the Olympics, in Athens." },
  { when: "2019", what: "The NAIA holds its first women's wrestling invitational.", sources: [S.naiaInvite] },
  { when: "2020", what: "The NCAA names women's wrestling an emerging sport. In North Carolina, Heaven Fitch of Uwharrie Charter becomes the first girl to win a state title, in the boys' bracket.", sources: [S.ncaa91, S.fitch] },
  { when: "2021", what: "Iowa announces women's wrestling, the first Power 5 school to add it; the team starts in 2023-24.", sources: [S.iowa] },
  { when: "2023", what: "The NAIA's first official women's championship (Southern Oregon wins).", sources: [S.naiaFirst] },
  { when: "2024", what: "The NCHSAA crowns its first girls' state champions (Lumberton wins the team title).", sources: [S.nchsaa] },
  { when: "Jan 2025", what: "The NCAA approves women's wrestling as its 91st championship sport; NCAA schools with a team grow from 76 to 95 in a year.", sources: [S.ncaa91] },
  { when: "Mar 2026", what: "The first NCAA women's championships: McKendree, a Division II program, beats Iowa for the team title.", sources: [S.ncaaFirst] },
  { when: "Spring 2028", what: "Division III gets its own women's championship.", sources: [S.d3Own] },
]

/** What families hear, and what is true. The program numbers are filled in on the page from our map. */
export const WOMENS_MYTHS: Array<{ heard: string; truth: string; sources?: WSource[] }> = [
  {
    heard: "There aren't many college options for girls.",
    truth: "There are {total} colleges with women's wrestling on our map today, at every level, and more are announced each year.",
  },
  {
    heard: "The good programs are all Division I.",
    truth: "Only {d1} Division I colleges have women's wrestling. At the first NCAA championships, McKendree, a Division II program, won the team title, and three of the top five teams (McKendree, North Central and Grand Valley State) were Division II or III.",
    sources: [S.ncaaFirst],
  },
  {
    heard: "College women's wrestling is a club sport.",
    truth: "It is a varsity NCAA championship sport since 2026, and the NAIA has crowned champions since 2023.",
    sources: [S.ncaa91, S.naiaFirst],
  },
  {
    heard: "College coaches look at her folkstyle record.",
    truth: "Women's college wrestling is freestyle. Coaches want to see her in freestyle: Fargo, the women's national events and freestyle tournaments.",
  },
  {
    heard: "There's no scholarship money for women's wrestling.",
    truth: "Division II and NAIA programs can each fund the equivalent of 10 full scholarships for women, more than Division II allows men (9). Division III gives academic and need-based aid, not athletic.",
  },
  {
    heard: "She'll be recruited the same way the boys are.",
    truth: "The market is younger and less crowded: many programs are new, and coaches are actively looking for wrestlers. A girl who reaches out early, with freestyle results and video, stands out.",
  },
]

export const WOMENS_MONEY: Array<{ level: string; aid: string }> = [
  { level: "Division I", aid: "Only a handful of colleges have women's teams, and what each can fund depends on whether it is in the House settlement. Ask each one directly." },
  { level: "Division II", aid: "Up to the equivalent of 10 full scholarships for women's wrestling, split across the team." },
  { level: "NAIA", aid: "Up to 10 for women's wrestling, separate from the men's 10 at a college with both." },
  { level: "Division III", aid: "No athletic scholarships: academic and need-based aid, the same as any student." },
  { level: "Junior college", aid: "Its own scholarship rules; often the lowest cost, and a path to a four-year program." },
]

export const WOMENS_PLAYBOOK = [
  "Wrestle freestyle: college women's wrestling is freestyle, and that is the film coaches want.",
  "Enter the women's national events: Fargo and the women's freestyle tournaments coaches attend.",
  "Write to coaches early, with results and video. Many programs are new and looking.",
  "Division I coaches may first contact a girl from June 15 at the end of her sophomore year; Division II, Division III and the NAIA at any time.",
  "Look at every level, and at Division II first: it is where most North Carolina girls have gone.",
]

export const NEW_PROGRAM_QUESTIONS = [
  "How long has the program existed, and how long has the coach been here?",
  "How many scholarships (or how much aid) does it fund, and how many wrestlers are on the roster?",
  "Where does the team practise, and who are the training partners?",
  "Is the college committed long-term: budget, staff, facilities?",
  "Where have its wrestlers placed, and how many stay all four years?",
]

export const STATES_NOTE = { text: "40 state associations now hold girls' high school state championships, and 8,853 high schools sponsor the sport (NFHS, 2025-26).", sources: [S.nfhs26] }

/**
 * Colleges with a women's team this season, from the map's program list: the count by level and
 * every Division I school by name. Scout was handed the guide with its numbers replaced by the word
 * "several", and told a family "several Division I colleges have women's wrestling" when the list
 * holds seven, by name (19 Oct 2026). The page and Scout fill from this one function.
 */
export function womensProgramFacts(): { total: number; byLevel: Array<{ level: CollegeDivision; count: number }>; divisionOne: string[] } {
  const schools = (programData.schools as CollegeMapSchool[]).filter((s) => s.programs.some((p) => p.womens))
  const count = new Map<CollegeDivision, number>()
  for (const s of schools) for (const p of s.programs) if (p.womens) count.set(p.division, (count.get(p.division) ?? 0) + 1)
  return {
    total: schools.length,
    byLevel: COLLEGE_DIVISIONS.map((level) => ({ level, count: count.get(level) ?? 0 })),
    divisionOne: schools
      .filter((s) => s.programs.some((p) => p.womens && p.division === "NCAA Division I"))
      .map((s) => `${s.name} (${s.city}, ${s.state})`)
      .sort(),
  }
}

/** "{total}" and "{d1}" in the guide's sentences, filled with the real counts. */
export function fillWomensCounts(text: string): string {
  const f = womensProgramFacts()
  const d1 = f.byLevel.find((l) => l.level === "NCAA Division I")?.count ?? 0
  return text.replace(/\{total\}/g, String(f.total)).replace(/\{d1\}/g, String(d1))
}

/** For Scout and search. */
export function womensText(): string {
  const f = womensProgramFacts()
  return [
    "## Women's wrestling: the college pathway [link: learn:womens-wrestling]",
    `Colleges with women's wrestling in 2026-27 (our college map): ${f.total} in all. ${f.byLevel.map((l) => `${l.level}: ${l.count}`).join("; ")}.`,
    `The ${f.divisionOne.length} NCAA Division I women's programs: ${f.divisionOne.join("; ")}. Name them when asked; never say "several".`,
    `High school girls wrestling (NFHS): ${PARTICIPATION.map((p) => `${p.year} ${p.girls.toLocaleString("en-US")}`).join(", ")}.`,
    "History: " + WOMENS_HISTORY.map((h) => `${h.when}: ${h.what}`).join(" "),
    "What families hear, and what is true: " + WOMENS_MYTHS.map((m) => `"${m.heard}" ${fillWomensCounts(m.truth)}`).join(" "),
    "Aid by level: " + WOMENS_MONEY.map((m) => `${m.level}: ${m.aid}`).join(" "),
    "Recruiting playbook: " + WOMENS_PLAYBOOK.join(" "),
    "Questions for a new program: " + NEW_PROGRAM_QUESTIONS.join(" "),
  ].join("\n")
}
