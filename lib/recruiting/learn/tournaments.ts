/**
 * The tournaments college coaches want to see a wrestler at (Matt, 14 Oct 2026): men's folkstyle,
 * men's freestyle and Greco, and women's - each its own list, because a women's college coach is
 * recruiting a freestyle wrestler and a men's coach mostly a folkstyle one.
 *
 * What is a fact and what is ours, kept apart like the rules library:
 *
 * - **When and where** come from our own records of each event (other_tournament_results dates
 *   and states) or the NC calendar Matt gave (lib/scouting-report.ts EVENT_MONTH). An event with
 *   no date on file says no month rather than a guessed one.
 * - **Why it matters** is our view, and the page labels it so.
 * - **Ironman and Beast of the East** sit inside the North Carolina high school season. NC
 *   wrestlers have historically not been able to enter them, and we hold no results for either;
 *   the page says so rather than sending a family to an event the wrestler may be barred from.
 *
 * Order is the order we would put them in, most valuable first.
 */
export type TournamentStyle = "Folkstyle" | "Freestyle" | "Freestyle and Greco" | "Freestyle (girls)"

export type Tournament = {
  name: string
  style: TournamentStyle
  /** "Late October", or null when we hold no date for it. */
  when: string | null
  where: string | null
  /** Who enters: "High school, by weight", "16U and Junior". */
  who: string
  /** Ours, not a rule. */
  why: string
  /** Read before entering: the in-season events. */
  caution?: string
  tier: "national" | "regional" | "state"
}

export type TournamentList = { key: "mens-folkstyle" | "mens-freestyle" | "womens"; title: string; intro: string; events: Tournament[] }

const COLLEGE_OPEN =
  "Most are held during the North Carolina high school season, and each sets its own entry rules for high school wrestlers. Check both with your athletic director and the event before entering."

/** Said at the top of the page: the list is a guide, not a limit. */
export const NOT_EVERY_EVENT =
  "Many elite tournaments are not on these lists. Any chance to wrestle high-quality competition is worth taking: tough matches are what make a wrestler better, and they are what a college coach wants to see on film."

const IN_SEASON =
  "Wrestled in December, inside the North Carolina high school season. NC high school wrestlers have historically not been able to enter, and we hold no NC results from it. Ask your athletic director before planning on it."

export const TOURNAMENT_LISTS: TournamentList[] = [
  {
    key: "mens-folkstyle",
    title: "Men: folkstyle",
    intro: "The style of the high school and college season. These are the brackets men's college staffs travel to, and the results they look up first.",
    events: [
      {
        name: "Super 32",
        style: "Folkstyle",
        when: "Late October (qualifiers in early September)",
        where: "Greensboro, North Carolina",
        who: "High school, by weight",
        why: "The deepest high school bracket of the fall, and a short drive for NC families. College staffs are in the stands, and a Super 32 placing is the first line on many recruits' résumés.",
        tier: "national",
      },
      {
        // Matt, 19 Oct 2026: the inaugural event drew more than 38 college coaches from more than 23 programs.
        name: "NC United Tournament of Champions",
        style: "Folkstyle",
        when: "September (the inaugural was September 18–19, 2026)",
        where: "Apex, North Carolina",
        who: "Invited high school wrestlers, at college weights",
        why: "Built for recruiting: small invite-only brackets at college weights, true double elimination, and a College Recruiting Expo in the same building. More than 38 college coaches from more than 23 programs came to the first one.",
        tier: "state",
      },
      {
        name: "NHSCA High School Nationals",
        style: "Folkstyle",
        when: "Mid-March",
        where: "Virginia Beach, Virginia",
        who: "High school, by grade: freshman to senior brackets",
        why: "Right after the state season, with brackets by grade, so a wrestler is measured against the same class. All-American is the top eight.",
        tier: "national",
      },
      {
        name: "NHSCA National Duals",
        style: "Folkstyle",
        when: "Late May",
        where: "Virginia",
        who: "High school club and state teams",
        why: "Many matches against national-level teams in two or three days: more film and more ranked opponents than an individual bracket gives.",
        tier: "national",
      },
      {
        name: "AAU Scholastic Duals",
        style: "Folkstyle",
        when: "Late June",
        where: null,
        who: "High school teams",
        why: "A summer national duals: a long run of matches against strong high school teams from across the country.",
        tier: "national",
      },
      {
        name: "Ironman",
        style: "Folkstyle",
        when: "December",
        where: "Ohio",
        who: "High school teams, by invitation",
        why: "One of the toughest in-season high school tournaments in the country.",
        caution: IN_SEASON,
        tier: "national",
      },
      {
        name: "Beast of the East",
        style: "Folkstyle",
        when: "December",
        where: "Delaware",
        who: "High school teams, by invitation",
        why: "The East Coast's deepest in-season high school tournament.",
        caution: IN_SEASON,
        tier: "national",
      },
      {
        name: "Journeymen Fall Classic",
        style: "Folkstyle",
        when: "Early October",
        where: "New York",
        who: "High school, by weight",
        why: "A national-level fall bracket a month before Super 32, and a chance to be seen twice in one autumn.",
        tier: "national",
      },
      {
        name: "College open tournaments",
        style: "Folkstyle",
        when: "November to February, during the college season",
        where: null,
        who: "College wrestlers; many also take high school entrants",
        why: "Wrestling college athletes, often in front of the coaches who would recruit you. A good showing against college wrestlers tells a coach more than any high school result.",
        caution: COLLEGE_OPEN,
        tier: "national",
      },
    ],
  },
  {
    key: "mens-freestyle",
    title: "Men: freestyle and Greco",
    intro: "The summer season. Fargo is the one every college coach watches; the rest build toward it.",
    events: [
      {
        name: "Fargo (16U and Junior Nationals)",
        style: "Freestyle and Greco",
        when: "July",
        where: "Fargo, North Dakota",
        who: "16U and Junior",
        why: "The biggest national tournament in the country. Fargo All-American carries weight with every college staff.",
        tier: "national",
      },
      {
        name: "Junior and 16U National Duals",
        style: "Freestyle and Greco",
        when: "Mid-June",
        where: "Oklahoma",
        who: "State teams, 16U and Junior",
        why: "Wrestling for Team North Carolina against every other state, a month before Fargo. Many matches against national-level opponents.",
        tier: "national",
      },
      {
        name: "US Open",
        style: "Freestyle and Greco",
        when: "April",
        where: "Las Vegas, Nevada",
        who: "High school and junior wrestlers in their own brackets, beside the senior national championship",
        why: "A national freestyle bracket in the spring, at the same event as the senior national championship.",
        tier: "national",
      },
      {
        name: "Southeast Regional Championships",
        style: "Freestyle and Greco",
        when: "Mid-May",
        where: null,
        who: "16U and Junior",
        why: "The regional step toward Fargo for wrestlers from the Southeast.",
        tier: "regional",
      },
      {
        name: "NC Freestyle and Greco State Championships",
        style: "Freestyle and Greco",
        when: "Early May",
        where: "North Carolina",
        who: "16U and Junior",
        why: "Where the summer starts at home, and where Team North Carolina is chosen from.",
        tier: "state",
      },
      {
        name: "Tar Heel State Classic",
        style: "Freestyle and Greco",
        when: "Mid-April",
        where: "North Carolina",
        who: "16U and Junior",
        why: "Early-spring freestyle matches before the regional and national events.",
        tier: "state",
      },
    ],
  },
  {
    key: "womens",
    title: "Women",
    intro: "Women's college wrestling is freestyle, so the summer and spring freestyle events count most, then the girls' folkstyle brackets.",
    events: [
      {
        name: "Fargo (16U and Junior Nationals)",
        style: "Freestyle (girls)",
        when: "July",
        where: "Fargo, North Dakota",
        who: "16U and Junior women",
        why: "The biggest national tournament for girls as well as boys. Women's college staffs recruit from it.",
        tier: "national",
      },
      {
        name: "USA Wrestling Women's Nationals",
        style: "Freestyle (girls)",
        when: null,
        where: "Spokane, Washington",
        who: "U15, U17 and U20",
        why: "USA Wrestling's own national championship for women, by age group.",
        tier: "national",
      },
      {
        name: "US Open: Girls High School Showcase",
        style: "Freestyle (girls)",
        when: "April",
        where: "Las Vegas, Nevada",
        who: "High school girls",
        why: "A national freestyle bracket run alongside the senior US Open.",
        tier: "national",
      },
      {
        name: "Super 32 (girls)",
        style: "Folkstyle",
        when: "Late October",
        where: "Greensboro, North Carolina",
        who: "High school girls, by weight",
        why: "The deepest girls' high school bracket of the fall, close to home.",
        tier: "national",
      },
      {
        name: "Women's National Duals",
        style: "Freestyle (girls)",
        when: "Mid-June",
        where: "Indiana",
        who: "State teams, 16U and Junior",
        why: "Wrestling for Team North Carolina against every other state: many matches against national-level girls before Fargo.",
        tier: "national",
      },
      {
        name: "Journeymen Women's World Classic",
        style: "Freestyle (girls)",
        when: null,
        where: null,
        who: "High school girls",
        why: "A national freestyle event for girls.",
        tier: "national",
      },
      {
        name: "Ultimate Club Duals",
        style: "Freestyle (girls)",
        when: "Mid-September",
        where: null,
        who: "Club teams",
        why: "Club duals, wrestled freestyle in the girls' division: a fall run of matches against strong club teams.",
        tier: "regional",
      },
      {
        name: "College open tournaments",
        style: "Freestyle (girls)",
        when: "November to February, during the college season",
        where: null,
        who: "College women; many also take high school girls",
        why: "Wrestling college athletes, often in front of the coaches who would recruit you. A good showing against college wrestlers tells a coach more than any high school result.",
        caution: COLLEGE_OPEN,
        tier: "national",
      },
      {
        name: "NHSCA High School Nationals (girls)",
        style: "Folkstyle",
        when: "Mid-March",
        where: "Virginia Beach, Virginia",
        who: "High school girls",
        why: "The national folkstyle bracket for girls after the state season.",
        tier: "national",
      },
      {
        name: "Southeast Regional Championships",
        style: "Freestyle (girls)",
        when: "Mid-May",
        where: null,
        who: "16U and Junior women",
        why: "The regional freestyle step toward Fargo.",
        tier: "regional",
      },
      {
        name: "NC Freestyle and Greco State Championships, and the Tar Heel State Classic",
        style: "Freestyle (girls)",
        when: "April and May",
        where: "North Carolina",
        who: "16U and Junior women",
        why: "Spring freestyle at home, before the regional and national events.",
        tier: "state",
      },
    ],
  },
]

/** A girl's family sees the women's list first, a boy's family the men's. */
export function listsFor(focus: "mens" | "womens" | null): TournamentList[] {
  if (focus !== "womens") return TOURNAMENT_LISTS
  return [...TOURNAMENT_LISTS].sort((a, b) => Number(b.key === "womens") - Number(a.key === "womens"))
}
