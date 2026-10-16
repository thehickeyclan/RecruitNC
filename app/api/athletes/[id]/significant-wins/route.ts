import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { latestSeasonMatchRows } from "@/lib/toc/ai-seeding"
import {
  findSignificantLosses,
  findSignificantWins,
  notableLossCredential,
  rankedOnBoard,
  significantWinCredential,
  withAccoladesOnly,
  type Bout,
} from "@/lib/significant-wins"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import { HEAD_TO_HEAD_WINDOW_DAYS } from "@/lib/head-to-head"
import { getCuratedSignificantWins } from "@/lib/curated-significant-wins"
import { getSubmittedWins } from "@/lib/athlete-submitted-wins"
import { highSchoolBouts, isHighSchoolSeason } from "@/lib/high-school-window"
import { loadOutOfStatePlacerIndex, loadRankedOpponents, tocFieldNames } from "@/lib/significant-opponent-index"
import { mergeBoutSources } from "@/lib/bout-source-deduplication"
import { styleOfEventForAthlete } from "@/lib/wrestling-style"
import { resolveRequestUserId } from "@/lib/request-user"
import { maySeeNotableLosses } from "@/lib/viewer-role"
import { sameReportedBout } from "@/lib/same-reported-bout"
import { stateNamedIn } from "@/lib/reported-win-state"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { isWin, reportedPlacerWeightFits } from "@/lib/significant-wins"

/**
 * The wins on a profile worth a reader's attention: over the TOC field, or over a ranked prospect.
 *
 * Ranked opponents include classes that are not published yet. The 2029 rankings are private, but
 * a win over one of those wrestlers is no less real — and only the fact of the ranking leaves this
 * endpoint, never the number, so nothing unpublished is disclosed by it.
 *
 * Most recent season only, the same window seeding uses for head-to-head. A significant win is an
 * argument about who somebody is beating now; a win from three seasons ago, at a different weight
 * and a different stage of growing up, is a different claim and does not belong in the same list.
 */

export const dynamic = "force-dynamic"

/**
 * Notable losses are for the people recruiting a wrestler, and nobody else: verified college
 * coaches and admins (Matt, 14 October 2026: "scouting reports, compare athletes, notable
 * losses.. all coaches only.. not parents or kid"). The wrestler's own family used to be included.
 * Decided here, not on the page: the website hid the row while this endpoint went on handing the
 * list to anyone who asked, and the iPhone app showed it. Cookie or bearer.
 */
async function maySeeLosses(request: NextRequest, admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const userId = await resolveRequestUserId(request).catch(() => null)
  if (!userId) return false
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  // A college coach has access from sign-up, before review (the same reading as the perfect-recruit flag).
  return maySeeNotableLosses(profile ?? null)
}

/**
 * Whether the opponent finished on a state podium, whatever the win's headline reason - a ranked
 * opponent who also placed is still a state placer, and the profile's counts should say so
 * (Kristopher Kerr, NC ranked and 2026 NCHSAA 4th, counted only as "ranked").
 */
function stateFinishOf(win: { reason: string; stateLabel?: string | null }): "champion" | "placer" | null {
  if (win.reason === "state-champion") return "champion"
  if (win.reason === "state-placer") return "placer"
  if (!win.stateLabel) return null
  // "State Champion", not Kentucky's "State Championship State 3rd".
  return /champion(?!ship)/i.test(win.stateLabel) ? "champion" : "placer"
}

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } }

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const lossesVisible = await maySeeLosses(request, admin)

  const [{ data: rawRows }, { data: invitations }, rawTournamentBouts, stateIndex, { data: gradRow }, rawEventBouts] = await Promise.all([
    admin.from("matches").select("season,matches,grade").eq("athlete_id", id),
    admin.from("toc_invitations").select("*, athletes(id,name)"),
    // Qualifier and national-event wins live in their own table, not in the match import.
    getQualifierSignificantWinBouts(admin, id, "wins", "any").catch(() => [] as Bout[]),
    // Other states' placers too: a win over a Virginia champion at NHSCA belongs here.
    loadOutOfStatePlacerIndex(admin),
    admin.from("athletes").select("graduationyear,gender").eq("id", id).maybeSingle(),
    // Wins and losses, last 12 months: the notable losses, as the scouting report lists them.
    getQualifierSignificantWinBouts(admin, id, "all").catch(() => [] as Bout[]),
  ])
  // No middle school seasons or bouts anywhere (Matt, 1 October 2026).
  const grad = (gradRow as { graduationyear?: number | null } | null)?.graduationyear ?? null
  const rows = (rawRows ?? []).filter((r: any) => isHighSchoolSeason(r.season, grad, r.grade))
  const tournamentBouts = highSchoolBouts(rawTournamentBouts as never[], grad) as Bout[]
  // Inside the head-to-head window they count for every reason; older ones only for a state
  // placer, like the earlier seasons of the match import below.
  const cutoff = Date.now() - HEAD_TO_HEAD_WINDOW_DAYS * 86_400_000
  const isOlder = (bout: Bout) => {
    const at = bout.date ? Date.parse(String(bout.date)) : Number.NaN
    return Number.isFinite(at) && at < cutoff
  }
  const qualifierBouts = tournamentBouts.filter((b) => !isOlder(b))
  const olderTournamentBouts = tournamentBouts.filter(isOlder)

  /*
   * Wins the athlete reported themselves, published without review.
   *
   * Carried with `source: "athlete-reported"` so the profile can label them. A coach is owed
   * the difference between a win we imported off a bracket and one someone typed into a form —
   * and the label is also what makes publishing-without-review safe to offer.
   */
  // Only with the opponent's accolade filled in: a win with no accolade does not make this list.
  const submittedWins = highSchoolBouts((await getSubmittedWins(admin, id)).filter((win) => win.credential.trim()), grad).map((win) => ({
    opponent: win.opponent,
    opponentSchool: win.opponentSchool,
    event: win.event,
    date: win.date,
    result: win.result,
    weight: null,
    reason: "credentialed" as const,
    credential: win.credential,
    scope: "national" as const,
    source: "athlete-reported" as const,
  }))

  const boutsOf = (row: unknown): Bout[] => {
    try {
      const value = (row as { matches?: unknown }).matches
      return Array.isArray(value) ? value : JSON.parse(String(value ?? "[]"))
    } catch {
      return []
    }
  }
  const latestRows = latestSeasonMatchRows((rows ?? []) as never)
  const matchBouts: Bout[] = highSchoolBouts(latestRows.flatMap(boutsOf) as never[], grad) as Bout[]
  /*
   * Earlier seasons count for one thing: a win over a state champion or placer. Every known win
   * over one belongs on the profile - a college coach wants to see who a wrestler has beaten, and
   * a state finalist beaten as a freshman is still a state finalist beaten. The other reasons keep
   * the current-season window above.
   */
  const earlierBouts: Bout[] = highSchoolBouts(
    [
      ...olderTournamentBouts,
      ...((rows ?? []) as unknown[]).filter((r) => !latestRows.includes(r as never)).flatMap(boutsOf),
    ] as never[],
    grad,
  ) as Bout[]
  // The same bout arrives from both the season import and an event CSV; merge them the way the
  // scouting report does, preferring the event row, so a win is not listed twice.
  const bouts: Bout[] = mergeBoutSources(qualifierBouts, matchBouts)
  const curatedWins = getCuratedSignificantWins(id).map((win) => ({
    ...win,
    reason: "credentialed" as const,
    scope: "national" as const,
  }))
  if (bouts.length === 0 && earlierBouts.length === 0 && curatedWins.length === 0 && submittedWins.length === 0) {
    return NextResponse.json({ wins: submittedWins, losses: [], lossesVisible }, PRIVATE)
  }

  const tocField = tocFieldNames(invitations)

  // Every ranked athlete, unpublished classes included (lib/significant-opponent-index.ts).
  const ranked = await loadRankedOpponents(admin)

  // "NC ranked" opponents from this wrestler's own board only: a ranked girl is not a boy's win.
  const index = rankedOnBoard({ tocField, ranked, ...stateIndex }, (gradRow as { gender?: unknown } | null)?.gender ?? null)
  const currentWins = findSignificantWins(bouts, index)
  const currentKeys = new Set(currentWins.map((w) => `${w.opponent.toLowerCase()}|${w.date}`))
  const earlierStateWins = findSignificantWins(earlierBouts, index, { stateOnly: true }).filter(
    (w) => !currentKeys.has(`${w.opponent.toLowerCase()}|${w.date}`),
  )
  // Accolades only: ranked (NC or national) or a state champion/placer. TOC field alone is dropped.
  const calculatedWins = withAccoladesOnly([...currentWins, ...earlierStateWins]).map((win) => ({
    opponent: win.opponent,
    opponentSchool: win.opponentSchool,
    event: win.event,
    date: win.date,
    result: win.result,
    weight: win.weight,
    reason: win.reason,
    // The opponent's state finish, when they have one, is the label a reader recognises - beside
    // the stronger reason rather than instead of it (lib/significant-wins.ts).
    credential: significantWinCredential(win),
    stateFinish: stateFinishOf(win),
    // A win over another state's placer is a national result, and the filter should say so.
    scope: win.opponentState && win.opponentState !== "NC" ? ("national" as const) : ("in-state" as const),
  }))

  /*
   * A family-added win, checked against our state results (Jim Bernthal, 16 October 2026: 21 wins
   * for Xavier, all over state placers, and the profile counted 11). The same matcher as every
   * imported bout, with the state the family typed standing where a bracket would print the
   * opponent's state ("Virginia 3rd Place" reads as NHSCA's "VA") - so a namesake in another state
   * is refused, and no state named means no check. A match takes our label and counts; the win
   * stays marked as family-reported, because the bout itself is still theirs.
   */
  const reportedState = (win: (typeof submittedWins)[number]) => stateNamedIn(win.credential)
  const checked = findSignificantWins(
    submittedWins
      .filter((win) => reportedState(win))
      .map((win) => ({
        opponent: win.opponent,
        // NC placers carry no state; their check is the name and school, as for an NC bracket line.
        opponent_school: reportedState(win) === "NC" ? win.opponentSchool : win.opponentSchool || reportedState(win),
        win_loss: "W",
        result: win.result,
        date: win.date,
        venue: win.event,
      })),
    index,
    { stateOnly: true },
  )
  const lastWeight = submittedWins.length
    ? await loadLastCompeted(admin, [id], new Map([[id, grad]]))
        .then((m) => Number.parseInt(String(m.get(id)?.weight ?? ""), 10) || null)
        .catch(() => null)
    : null
  /*
   * His weight at the time: the nearest bout we hold with a weight, within six months either way.
   * Unknown means the placer cannot be confirmed - a name and a state are not enough without it.
   */
  const weighed = [...(rawEventBouts as Bout[]), ...(rawTournamentBouts as Bout[]), ...matchBouts]
    .map((b) => ({ day: Date.parse(String(b.date ?? "")), weight: Number.parseInt(String(b.weight ?? ""), 10) }))
    .filter((b) => Number.isFinite(b.day) && Number.isFinite(b.weight) && b.weight > 0)
  const weightAt = (date: string | null | undefined): number | null => {
    const day = Date.parse(String(date ?? ""))
    if (!Number.isFinite(day)) return null
    const near = weighed
      .filter((b) => Math.abs(b.day - day) <= 183 * 86_400_000)
      .sort((a, b) => Math.abs(a.day - day) - Math.abs(b.day - day))[0]
    // No bout of his near that date carries a weight: the weight he last competed at.
    return near?.weight ?? lastWeight
  }
  /*
   * The bout itself, where we hold the event: a win over that opponent within two days in our
   * brackets. Then it is no longer only the family's word.
   */
  const inBrackets = (win: (typeof submittedWins)[number]) =>
    [...(rawEventBouts as Bout[]), ...(rawTournamentBouts as Bout[])].some(
      (b) =>
        isWin(b) &&
        sameReportedBout(
          { opponent: win.opponent, date: win.date, event: win.event, result: win.result },
          { opponent: String(b.opponent ?? b.opponent_name ?? ""), date: b.date ?? null, event: b.venue ?? null, result: b.result ?? null },
        ),
    )
  const verifiedSubmitted = submittedWins.map((raw) => {
    const win = { ...raw, boutVerified: inBrackets(raw) }
    const claimed = reportedState(win)
    const hit = claimed
      ? checked.find(
          (c) =>
            c.opponent.toLowerCase() === win.opponent.toLowerCase() &&
            c.date === win.date &&
            (c.reason === "state-champion" || c.reason === "state-placer") &&
            (claimed === "NC" ? !c.opponentState || c.opponentState === "NC" : c.opponentState === claimed) &&
            // His weight then must be known, and must fit the placer's finishes wherever those carry a weight.
            weightAt(win.date) != null &&
            reportedPlacerWeightFits(index, win.opponent, claimed, win.date, weightAt(win.date)) !== false,
        )
      : null
    if (!hit) return win
    return {
      ...win,
      reason: hit.reason,
      credential: significantWinCredential(hit) ?? win.credential,
      stateFinish: stateFinishOf(hit),
      scope: hit.opponentState && hit.opponentState !== "NC" ? ("national" as const) : ("in-state" as const),
    }
  })

  /*
   * The same bout, reported twice. A family's submitted win and the imported bracket rarely agree
   * to the letter - JT Hill's TOC win arrived as "Jay Mills", 19 September, from the family and as
   * "Jeshurun Mills", 18 September, from the bracket - so two entries are one bout when the names
   * could be the same person and the dates are within two days. The earlier list wins.
   * (lib/same-reported-bout.ts)
   */
  const wins: Array<(typeof verifiedSubmitted)[number] | (typeof curatedWins)[number] | (typeof calculatedWins)[number]> = []
  for (const win of [...verifiedSubmitted, ...curatedWins, ...calculatedWins]) {
    if (!wins.some((kept) => sameReportedBout(kept, win))) wins.push(win)
  }

  /*
   * Folkstyle or freestyle/Greco, so the profile can list them apart. The wrestler's own gender
   * decides the events that are one style for the men and another for the women - the Ultimate
   * Club Duals are folkstyle for the boys and freestyle for the girls.
   */
  const gender = (gradRow as { gender?: string | null } | null)?.gender ?? null

  /*
   * Notable losses (Matt, 8 October 2026: colleges want them under the wins, as the scouting
   * report has them). The report's rule exactly: this season's bouts, a loss to a ranked, nationally
   * ranked, state champion or state-placing opponent.
   */
  const lossBouts = mergeBoutSources(highSchoolBouts(rawEventBouts as never[], grad) as Bout[], matchBouts)
  const losses = !lossesVisible ? [] : withAccoladesOnly(findSignificantLosses(lossBouts, index)).map((loss) => ({
    opponent: loss.opponent,
    opponentSchool: loss.opponentSchool,
    event: loss.event,
    date: loss.date,
    result: loss.result,
    weight: loss.weight,
    reason: loss.reason,
    credential: notableLossCredential(loss),
    scope: loss.opponentState && loss.opponentState !== "NC" ? ("national" as const) : ("in-state" as const),
    style: styleOfEventForAthlete(loss.event, null, gender),
  }))

  return NextResponse.json(
    {
      wins: wins.map((w) => ({ ...w, style: styleOfEventForAthlete(w.event, null, gender) })),
      losses,
      // False means withheld, not "none on file": the row should not be drawn at all.
      lossesVisible,
    },
    PRIVATE,
  )
}
