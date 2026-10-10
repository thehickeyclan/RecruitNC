/**
 * Which wrestler did our kid actually beat, and which win was the best.
 *
 * Written after the 2026 I-64 Fall Duals, where judging name matches by eye produced a list that
 * was wrong in both directions at once: it announced a win over a three-time Kentucky state
 * champion that never happened, and it left four real wins out. These rules are that post-mortem.
 *
 *   1. THE EVENT'S STATE WINS. A duals meet in Virginia Beach is full of Virginia club teams, so
 *      when a name matches a credential in the host state and another elsewhere, the host state
 *      is the wrestler. Applied afterwards by hand, this one rule recovered five omitted wins.
 *
 *   2. NO HOST-STATE RECORD MEANS UNKNOWN, NOT FAMOUS. "Jackson Wells" had one placing record
 *      anywhere, in Kentucky, and the weights lined up - he was a Benedictine eighth grader with
 *      no record at all. A middle schooler, a private-school wrestler and a kid who never placed
 *      are all equally absent from our data, so absent has to mean absent.
 *
 *   3. A WEIGHT PROGRESSION IS NOT AN IDENTITY. 106 -> 113 -> 120 -> 126 over four seasons is
 *      what made the Kentucky match look certain. Weights rise for everybody.
 *
 *   4. THE CLUB IS EVIDENCE. An offseason club usually sits in the wrestler's own town, so a club
 *      name echoing the school name confirms an identity outright.
 *
 *   5. FIRST AND LAST NAME ONLY. "Tijuan l Powell" matched nothing until the middle initial came
 *      out, and he had a VA 5A third place all along - a real win reported as no win.
 *
 * Ranking weighs three things, in order: the placement, the size of the classification it came
 * from, and whether the opponent had moved up in weight since earning it.
 */

/** First and last token only: middle initials and suffixes hide real matches. */
export function nameKey(raw: unknown): string {
  const t = String(raw ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ").replace(/\b(jr|sr|ii|iii|iv)\b/g, " ")
    .split(/\s+/).filter((w) => w.length > 1)
  return t.length < 2 ? "" : `${t[0]} ${t[t.length - 1]}`
}
export const lbs = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}
/** Words that identify a school or club, with the generic ones removed. */
export const placeWords = (s: unknown) =>
  new Set(String(s ?? "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 3 && !["high", "school", "wrestling", "club", "academy", "area", "team", "county"].includes(w)))

export type Credential = { state: string; place: number; season: number | null; weight: number | null; text: string; school: string }
export type TopWin = {
  wrestler: string; wrestlerClass: number | null; wrestlerSchool: string
  weight: number | null; winType: string; score: string; round: string
  opponent: string; opponentClub: string
  credential: Credential; tier: number
  sameWeight: boolean; clubConfirmsSchool: boolean; movedUp: number | null
  confidence: "confirmed" | "probable"
}

/** Pick the one credential that belongs to the wrestler who actually competed, or none. */
export function resolveOpponent(
  rows: Credential[], hostState: string, boutWeight: number | null, club: string,
): { chosen: Credential | null; reason: string } {
  if (rows.length === 0) return { chosen: null, reason: "no record anywhere" }
  const placed = rows.filter((r) => r.place >= 1 && r.place <= 4)
  if (placed.length === 0) return { chosen: null, reason: "on file but never placed" }
  // Rule 4: a club whose name echoes the school settles it outright.
  const cw = placeWords(club)
  const byClub = placed.filter((r) => [...placeWords(r.school)].some((w) => cw.has(w)))
  if (byClub.length === 1) return { chosen: byClub[0]!, reason: "club name matches the school" }
  // Rule 1: the host state wins.
  const host = placed.filter((r) => r.state === hostState)
  if (host.length >= 1) {
    const near = boutWeight == null ? host : host.filter((r) => r.weight == null || Math.abs(r.weight - boutWeight) <= 25)
    const pool = near.length ? near : host
    const best = [...pool].sort((a, b) => a.place - b.place || (b.season ?? 0) - (a.season ?? 0))[0]!
    return { chosen: best, reason: host.length === 1 ? "only record in the host state" : "best record in the host state" }
  }
  /*
   * Rule 2. Past here the name has no placement in the host state, and both ways of getting it
   * wrong have already happened once.
   *
   * Namesakes are counted over EVERY row under the name, not just the placing ones. "Carter
   * Davis" placed once, in Delaware, and reads as a single clean identity until you notice the
   * same name on a Pennsylvania 160-pounder and a Colorado heavyweight who never placed.
   *
   * And a lone out-of-state credential is not enough on its own. That is exactly what promoted
   * an eighth grader at a Virginia club into a three-time Kentucky state champion: his name had
   * one placing record anywhere, it was in Kentucky, and the weights happened to line up. At an
   * event in another state, an out-of-state credential needs the club to corroborate it.
   */
  const allStates = new Set(rows.map((r) => r.state).filter(Boolean))
  if (allStates.size > 1) {
    return { chosen: null, reason: `no host-state placement and the name is shared across ${allStates.size} states (${[...allStates].sort().join("/")})` }
  }
  const only = placed[0]!
  if (boutWeight != null && only.weight != null && Math.abs(only.weight - boutWeight) > 25) {
    return { chosen: null, reason: `only record is ${Math.abs(only.weight - boutWeight)} lb off this bout` }
  }
  const corroborated = [...placeWords(only.school)].some((w) => placeWords(club).has(w))
  if (!corroborated) {
    return { chosen: null, reason: `only credential is in ${only.state}, at an event in ${hostState}, and the club does not corroborate it` }
  }
  return { chosen: only, reason: "out-of-state record, club corroborates the school" }
}

/** Best win first: credential, then classification size, then whether he gave up weight. */
export function rankWins(wins: TopWin[]): TopWin[] {
  const bigClass = (t: string) => /6A/.test(t) ? 0 : /5A/.test(t) ? 1 : /4A/.test(t) ? 2 : /3A/.test(t) ? 3 : /2A/.test(t) ? 4 : /1A/.test(t) ? 5 : 3
  return [...wins].sort((a, b) =>
    a.tier - b.tier ||
    bigClass(a.credential.text) - bigClass(b.credential.text) ||
    Number(b.sameWeight) - Number(a.sameWeight) ||
    (a.movedUp ?? 0) - (b.movedUp ?? 0))
}
