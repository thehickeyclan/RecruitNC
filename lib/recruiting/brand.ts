import { classifyViewer } from "@/lib/viewer-role"

/**
 * The recruiting product's name and the states it covers, in one place (Matt, 11 October 2026).
 *
 * Recruiting is being separated from the NC United community site: its own header and footer, a
 * name that will change before the second state goes live, and states added one at a time. Pages a
 * coach uses read the name and the coverage from here rather than typing "RecruitNC" or "North
 * Carolina", so the rename is this file and a new state is one more entry in `states`.
 */
export const RECRUITING_BRAND = {
  name: "RecruitNC",
  /** Drawn as two tones in the header: the second part takes the accent colour. */
  wordmark: ["Recruit", "NC"] as const,
  tagline: "College wrestling recruiting, built on verified results.",
  /** Who runs the community side, and who holds the copyright until the company exists. */
  parent: "NC United Wrestling",
  supportEmail: "info@ncwrestlingunited.com",
  /**
   * States whose wrestlers are in the product, in the order they opened. Each state is its own
   * brand to families - Recruit + the state code (Matt, 15 October 2026). `live: false` is a state
   * being checked before it is announced: admins can open it, coaches cannot, and the coverage
   * line does not name it. Setting it to true is the launch.
   */
  states: [
    { code: "NC", name: "North Carolina", live: true },
    { code: "SC", name: "South Carolina", live: true }, // Live 26 Oct 2026 (Matt); scripts/state-readiness.ts --state SC: all data gates pass
    // Live 3 Nov 2026 (Matt: "virginia should be up.. we won't have rankings for a bit"). Open, not ranked yet.
    { code: "VA", name: "Virginia", live: true, ranked: false },
    // Live 5 Nov 2026 (Matt: "switch it to on"). Open, not ranked yet.
    { code: "TN", name: "Tennessee", live: true, ranked: false },
    /*
     * Maryland's data went in on 22 Oct and passes every readiness gate, but the state was
     * missing from this list entirely - and a state that is not here does not exist to the
     * product: /api/prospects answers "That state is not open yet" for it, to admins too. So
     * 224 Maryland profiles were unreachable by anybody, including the people checking them.
     */
    { code: "MD", name: "Maryland", live: false },
    { code: "WV", name: "West Virginia", live: false },
    { code: "DE", name: "Delaware", live: false },
    /*
     * Live 5 Nov 2026, the same day as Tennessee and the largest state we have opened: 1,244
     * profiles against South Carolina's 875 and Virginia's 825. Open, not ranked - no Georgia
     * ranker yet.
     *
     * Two associations, GHSA and GIAA, 18,948 bout sides, and every single profile has a state
     * result behind it: 431 placed, 813 qualifier-only, none with nothing. 328/328 of its 2026
     * placers are accounted for and no current-class profile is missing a school or a gender.
     */
    { code: "GA", name: "Georgia", live: true, ranked: false },
    { code: "FL", name: "Florida", live: false },
    { code: "AL", name: "Alabama", live: false },
    { code: "LA", name: "Louisiana", live: false },
    { code: "MS", name: "Mississippi", live: false },
    { code: "KY", name: "Kentucky", live: false },
    { code: "IN", name: "Indiana", live: false },
    { code: "NJ", name: "New Jersey", live: false },
    { code: "NY", name: "New York", live: false },
    { code: "CT", name: "Connecticut", live: false },
    { code: "MA", name: "Massachusetts", live: false },
    { code: "RI", name: "Rhode Island", live: false },
    { code: "NH", name: "New Hampshire", live: false },
    { code: "VT", name: "Vermont", live: false },
    { code: "ME", name: "Maine", live: false },
    /*
     * Pennsylvania ships below the 95% placer bar and says so: the PIAA event prints no grades at
     * all for 2025, so a wrestler who placed only that season has nothing to resolve a class year
     * from, and RankWrestlers holds little of the state. 336 of 692 placer keys carry a year
     * (48.6%); the other 356 ship blank and do not mint. Thirty-eight unresolved champions are
     * named in the package note. Registered anyway so the rows are reachable while the gap is
     * worked - a state that is not in this list does not exist to the product, to admins included.
     *
     * PA is also the first state where we hold two championships: PIAA, and the PAISWT the prep
     * schools wrestle instead (lib/athlete-state.ts).
     */
    { code: "PA", name: "Pennsylvania", live: false },
    /*
     * Texas clears the placer bar on arrival: 1,017 of 1,022 keys (99.5%), no unresolved champion,
     * and a stable wrestler id on all 3,663 entrant rows. Four championships, so four names a
     * credential card can carry (lib/athlete-state.ts).
     */
    { code: "TX", name: "Texas", live: false },
    /*
     * Arkansas clears the placer bar: 1,040 of 1,042 keys (99.8%), every champion resolved, and
     * one association - the private schools wrestle inside the AAA brackets, so there is no second
     * championship to name.
     *
     * It is the first state whose podium is not unique. Arkansas wrestles no fifth-place match, so
     * both consolation semi-final losers take fifth: 420 tied placements across 210 brackets, in
     * every bracket of every year. `state_tournament_placers` cannot hold them until its unique
     * index admits a tie, so the rows in the table are the 6 Oct build - places 1-4 only.
     */
    { code: "AR", name: "Arkansas", live: false },
    /*
     * Oklahoma clears the placer bar: 926 of 932 keys (99.4%), every one of its 235 champion keys
     * resolved, and all 252 champions verified against the winner of their own final. One
     * association - the private schools are OSSAA members and wrestle its brackets.
     *
     * OSSAA places TOP 4 ONLY. Every one of the 252 brackets carries a final and one third-place
     * match and nothing below, so unlike Arkansas there are no ties to store - but it is the second
     * state running in a row whose podium is not the assumed six.
     */
    { code: "OK", name: "Oklahoma", live: false },
    /*
     * Iowa clears the placer bar at 1,108 of 1,109 keys (99.9%), with one named unresolved
     * champion - Koy Davidson, whose Flo print reads 'HS Senior' in two different years and whom
     * RankWrestlers does not hold at all.
     *
     * It is the first state with a separate girls championship body: IHSAA for the boys, IGHSAU
     * for the girls (lib/athlete-state.ts). Girls ran a single class in 2024 and split into 1A/2A
     * for 2025, so their 2024 placements carry the classification "Girls". Top 8 in all 196
     * brackets, and every figure lands exactly on the scoping ceiling in all three years.
     */
    { code: "IA", name: "Iowa", live: false },
    /*
     * Missouri is the first state in the lineage to resolve every placer key from the payloads'
     * own grade prints: 1,054 of 1,054, no conflicts and nothing not found. All 192 champion keys
     * resolved, and all 252 champions verified against the winner of their own final.
     *
     * Top 6, and the one thing that makes it importable at all is Arkansas's work: the 2025 Class 2
     * bracket at 132 has a VACANT 5th and two wrestlers TIED at 6th, because the placement match
     * was a double forfeit (MSHSAA prints it verbatim). Under the old unique podium index that
     * slice would have been refused outright. One association for both genders.
     */
    { code: "MO", name: "Missouri", live: false },
    /*
     * Michigan: 1,504 of 1,504 placer keys resolved, all 191 champion keys among them, and all 210
     * champions verified against the winner of their own final. Top 8, 14 weights, 16-wrestler
     * brackets throughout, and boys and girls share one event each year at Ford Field. One
     * association, MHSAA, which the private schools wrestle inside.
     *
     * Its canonical retrofit came back needing nothing: 426 mint keys fold to 357 athletes on
     * literal names alone, the same 357 the build states, with no differing-name folds anywhere -
     * so unlike Texas it mints without --canonical.
     */
    { code: "MI", name: "Michigan", live: false },
    /*
     * Minnesota is the cleanest package the pipeline has produced: 672 of 672 placer keys resolved,
     * all 114 champion keys among them, and all 156 champions verified against the winner of their
     * own final. Every one of its 936 placed rows carries a class year.
     *
     * It is also the first to ship `canonical_athlete_id` natively rather than by retrofit, and the
     * first where that grouping and our matcher agree exactly - 213 athletes either way - so it
     * needs no --canonical at all. Its championships never entered FloArena: the build runs on
     * Trackwrestling for 2024/2025 and USA Bracketing for 2026, against The Guillotine's official
     * results. One association, MSHSL. Top 6, three classes plus girls.
     */
    { code: "MN", name: "Minnesota", live: false },
    /*
     * Ohio, Illinois and Wisconsin were built on 2 Nov and their packages sat in Downloads
     * unregistered, so every tool that reads this list treated them as states we had never
     * touched - the coverage map drew them grey as "Coming" while Ohio alone held 1,307 placer
     * rows that the 5 Nov qualifier harvest filled with class years. The data was there the whole
     * time; the registration was the missing line.
     *
     * Ohio and Illinois are the two largest wrestling states we hold outside the live three.
     */
    { code: "OH", name: "Ohio", live: false },
    { code: "IL", name: "Illinois", live: false },
    { code: "WI", name: "Wisconsin", live: false },
    /*
     * The first two states built tab-first from the start (Muse, 5 November 2026): grades came off
     * the participants tabs at fetch time rather than from a RankWrestlers queue afterwards, and
     * both came back essentially complete - Nebraska 995 of 995 placer keys resolved with no RW
     * pass at all, Colorado 1,025 of 1,026.
     */
    { code: "NE", name: "Nebraska", live: false },
    { code: "CO", name: "Colorado", live: false },
    { code: "UT", name: "Utah", live: false },
    { code: "ID", name: "Idaho", live: false },
    { code: "AZ", name: "Arizona", live: false },
  ],
} as const

/**
 * The national product: RecruitWrestlers, on recruitwrestlers.com (Guild Ventures, 15 October
 * 2026). Drawn like the state marks - RECRUIT in white, the second word in gold - so RecruitNC,
 * RecruitSC and RecruitWrestlers read as one family. No owner name in the mark; the footer credit
 * waits for the exact legal name.
 */
export const NATIONAL_BRAND = {
  name: "RecruitWrestlers",
  wordmark: ["Recruit", "Wrestlers"] as const,
  domain: "recruitwrestlers.com",
  /** Where accounts, sign-in and the Command Center live until the app itself moves. */
  appOrigin: "https://app.ncwrestlingunited.com",
} as const

export { NATIONAL_PATH_PREFIXES, isNationalPath } from "@/lib/recruiting/national-paths"

/** recruitwrestlers.com or www.recruitwrestlers.com. */
export function isNationalHost(hostname: string | null | undefined): boolean {
  const h = String(hostname ?? "").toLowerCase()
  // next.: the new Vercel project's test address (docs/RECRUITWRESTLERS-VERCEL-SPLIT.md).
  return h === NATIONAL_BRAND.domain || h === `www.${NATIONAL_BRAND.domain}` || h === `next.${NATIONAL_BRAND.domain}`
}

/** "RecruitNC", "RecruitSC": a state's own brand to families. */
export const stateBrand = (code: string) => `Recruit${code.toUpperCase()}`

export type RecruitingState = (typeof RECRUITING_BRAND.states)[number]

/**
 * The states open on an address. RecruitWrestlers carries every live state; NC United is its NC
 * licensee and reports North Carolina only (Matt, 26 Oct 2026: "nc united will only report on nc..
 * like an oem of recruitwrestlers"). Defaults to NC United's view, so a caller that does not say
 * which address it is on never shows another state there.
 */
export function liveStates(onRecruitWrestlers = false): RecruitingState[] {
  return RECRUITING_BRAND.states.filter((s) => (onRecruitWrestlers ? s.live : s.code === "NC"))
}

/**
 * States a viewer may open: the live ones on this address, the ones still being checked if an
 * admin, and any named for this viewer by `preview`.
 *
 * `preview` exists because the launch checklist asks for a real in-state coach session and a real
 * family claim BEFORE a state goes live, and until it the only account that could see a
 * not-yet-live state was an admin. That is circular - to launch we need a coach to look, and to
 * let a coach look we had to launch - and the only way through it was handing a college coach the
 * admin surface. A named account previewing a named state is the smaller permission.
 *
 * A preview is granted per account and per state, so it holds on either address. The OEM rule
 * above governs what a brand reports to the public, not what a person who has been handed a
 * specific state may open - an admin already crosses it the same way.
 */
export function visibleStates(
  isAdmin: boolean,
  onRecruitWrestlers = false,
  preview: readonly string[] = [],
): RecruitingState[] {
  const live = new Set(liveStates(onRecruitWrestlers).map((s) => s.code))
  const named = new Set(preview.map((c) => String(c).trim().toUpperCase()).filter(Boolean))
  return RECRUITING_BRAND.states.filter((s) => live.has(s.code) || isAdmin || named.has(s.code))
}

export function isVisibleState(
  code: string | null | undefined,
  isAdmin: boolean,
  onRecruitWrestlers = false,
  preview: readonly string[] = [],
): boolean {
  return visibleStates(isAdmin, onRecruitWrestlers, preview).some((s) => s.code === String(code ?? "").toUpperCase())
}

/**
 * States the athlete directory lists. RecruitWrestlers lists every state we hold profiles for,
 * ranked or not (Matt, 3 Nov 2026: "why not have it there too?"): the profiles are public by link
 * already, and a family who cannot find their wrestler makes a second one. Rankings and state
 * pages stay on the live states. NC United lists what it always did.
 */
export function directoryStates(
  isAdmin: boolean,
  onRecruitWrestlers = false,
  preview: readonly string[] = [],
): RecruitingState[] {
  return onRecruitWrestlers ? RECRUITING_BRAND.states : visibleStates(isAdmin, false, preview)
}

export function isDirectoryState(
  code: string | null | undefined,
  isAdmin: boolean,
  onRecruitWrestlers = false,
  preview: readonly string[] = [],
): boolean {
  return directoryStates(isAdmin, onRecruitWrestlers, preview).some((s) => s.code === String(code ?? "").toUpperCase())
}

/**
 * Live states that have rankings. A state can open before its board exists (Virginia, 3 Nov 2026):
 * its profiles, directory and claims are live, but Insider is not sold there and the rankings pages
 * do not offer it until `ranked: false` comes off.
 */
export function isRankedState(state: RecruitingState): boolean {
  return !("ranked" in state) || (state as { ranked?: boolean }).ranked !== false
}

export function rankedStates(onRecruitWrestlers = false): RecruitingState[] {
  return liveStates(onRecruitWrestlers).filter(isRankedState)
}

/** "North Carolina and South Carolina": the live states with rankings. */
export function rankingsCoverage(onRecruitWrestlers = false): string {
  const names = rankedStates(onRecruitWrestlers).map((s) => s.name)
  return new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(names)
}

/** "North Carolina", "North Carolina and South Carolina", "North Carolina, South Carolina, and Virginia". */
export function recruitingCoverage(onRecruitWrestlers = false): string {
  const names = liveStates(onRecruitWrestlers).map((s) => s.name)
  return new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(names)
}

/**
 * Who gets the recruiting interface: a college coach, and not an admin, who works on both sides and
 * keeps the full community bar.
 */
/**
 * An admin can look at the coach interface without a coach login: /coach-home?view=coach turns it
 * on in this browser, ?view=admin (or "Exit coach view" in the account menu) turns it off.
 */
export const COACH_PREVIEW_KEY = "recruiting-shell-preview"

/**
 * Programs whose coaches also use the NC United site, by `schools.id`.
 *
 * The coach portal carries nothing of NC United - except for a program that works with NC United
 * as well as recruiting from it. NC United practices in UNC's wrestling room, so UNC's staff need
 * the NC United calendar and site (Matt, 13 October 2026). Their home is still Coach Home; they
 * get a way across that no other coach is shown.
 */
export const COMMUNITY_PARTNER_SCHOOL_IDS: readonly string[] = [
  "8a62c142-afec-457f-b908-24fa0df0e273", // UNC Chapel Hill
]

/** The NC United pages a partner program's coaches are given links to. */
export const COMMUNITY_PARTNER_LINKS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/?community=1", label: "NC United site" },
] as const

export function hasCommunityAccess(profile: { role?: string | null; is_admin?: boolean | null; school_id?: string | null } | null | undefined): boolean {
  return usesRecruitingShell(profile) && COMMUNITY_PARTNER_SCHOOL_IDS.includes(String(profile?.school_id ?? ""))
}

export function usesRecruitingShell(profile: { role?: string | null; is_admin?: boolean | null } | null | undefined): boolean {
  // classifyViewer, not a literal compare: the role is stored as both "college_coach" and "college-coach".
  return classifyViewer(profile).isCollegeCoach && profile?.is_admin !== true
}
