/**
 * Which bouts are linked to the wrong wrestler - decided by rule, every night, not by a person
 * remembering to run a script (Matt, 29 October 2026: "this should have all been cleaned up
 * automatically").
 *
 * The importers write `other_tournament_bouts.athlete_id` on a name match, and profiles read that
 * column. The identity registry had already marked Carson Owens's Team Shutt and GT 4238 entries
 * and Isaac Young's Forge entries "review: ambiguous", but nothing read the verdict, so each new
 * import put the namesake's bouts back - Carson three times. scripts/audit-bout-links.ts caught
 * some of it, only when run.
 *
 * A link is dropped when:
 *   1. the registry REJECTED that spelling-and-team - a family or admin said "not me", and it stays
 *      said through every later import;
 *   2. the bout's gender is not the athlete's, at a national event with its own girls' brackets
 *      (Fargo, Super 32, NHSCA). Girls wrestle in boys' brackets at some state tournaments, so
 *      those are left alone;
 *   3. the weight cannot be his: more than 15% BELOW what he wrestled that season (nobody cuts
 *      that far mid-season), or more than 30% above it. Wrestling up is common - heavyweights at
 *      duals, girls at the national duals - so 182 and up is never judged, and a modest bump is
 *      fine. A 132-pound bout on a 190-pounder is somebody else;
 *   4. it was entered under another state's code ("MO" at Fargo on an NC wrestler) AND the weight
 *      disagrees, or there is no weight of his to compare with and he is from NC. A club's state is
 *      not the wrestler's (D'Ettore wrestles for an SC club), so the code alone decides nothing
 *      when the weight fits.
 * His weights come from trusted bouts: entered under his own state or school, or linked to him by
 * the registry. Weights under 95 are skipped - the women's freestyle events print kilograms.
 *
 * Only `athlete_id` is cleared: the bout stays, as the other wrestler's record.
 */

export type GuardAthlete = { id: string; name: string; gender?: string | null; state?: string | null; highschool?: string | null }
export type GuardBout = {
  id: string
  athlete_id: string
  athlete_name: string
  athlete_club?: string | null
  gender?: string | null
  event_key: string
  weight_class?: string | null
  event_date?: string | null
  year?: number | null
}
/** identity_aliases, keyed by `aliasKey(name, team)`: its status and the identity it links to. */
export type AliasVerdict = { status: string; identityId?: string | null }

/** "athlete name|state": a person has confirmed this out-of-state entrant is our wrestler. */
export const REVIEWED_STATE_ENTRIES = new Set<string>([
  // 23 Oct 2026. A national entry's state is the club or registration choice, not the wrestler's
  // identity: these are our wrestlers, weights checked.
  "Jackson D'Ettore|SC", // Charlotte Catholic, wrestles for an SC club; weights 106-120 match
  "Joshua Brown|SC", // Jesse Carson, Charlotte-area kid on an SC club
  "Brieon Mayfield|NA", // "NA" is not a state; 215 matches him
])

/** Waiting on a person's call (8 October 2026): rare names at the weight they wrestle here. Never unlinked. */
export const HELD_STATE_ENTRIES = new Set<string>([
  "Jaclyn Bouzakis|PA",
  "Katherine Donohue|VA",
])

/** Further below his weight than this is somebody else (25% when only a neighbouring season is known). */
const BELOW = 0.15
const BELOW_NEIGHBOUR = 0.25
/** Further above than this is somebody else. */
const ABOVE = 0.3
/** From here up nobody is judged on weight: the upper weights move between classes. */
const UPPER_WEIGHTS = 182
/** National events that run separate girls' brackets: a gender mismatch there is a different person. */
const GENDERED_EVENT = /^(fargo|super32|nhsca|journeymen)/
const NC_NEIGHBOURS = new Set(["SC", "VA", "TN", "GA"])

export const aliasKey = (name: string, team: string | null | undefined) =>
  `${String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ")}|${String(team ?? "").trim().toLowerCase()}`

const sex = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase()
  return s.startsWith("f") ? "F" : s.startsWith("m") ? "M" : ""
}

/** The high-school season a bout belongs to: autumn counts toward the next spring's season. */
export function boutSeason(b: Pick<GuardBout, "event_date" | "year">): number | null {
  const d = String(b.event_date ?? "").match(/^(\d{4})-(\d{2})/)
  if (d) return Number(d[2]) >= 8 ? Number(d[1]) + 1 : Number(d[1])
  return b.year ?? null
}

const weightOf = (b: GuardBout) => {
  const n = Number.parseInt(String(b.weight_class ?? "").replace(/^\D+/, ""), 10)
  return Number.isFinite(n) && n >= 95 && n <= 300 ? n : null
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2
}

/** The school's distinctive word, for "Pisgah High School" against a profile's "Pisgah". */
function schoolMatches(club: string, school: string | null | undefined): boolean {
  const word = String(school ?? "")
    .toLowerCase()
    .replace(/\b(high|school|hs|academy|senior|the|of)\b/g, " ")
    .trim()
    .split(/\s+/)
    .find((w) => w.length >= 4)
  return Boolean(word && club.toLowerCase().includes(word))
}

export function boutsToUnlink(
  athletes: ReadonlyMap<string, GuardAthlete>,
  bouts: readonly GuardBout[],
  aliases: ReadonlyMap<string, AliasVerdict>,
  identityByAthlete: ReadonlyMap<string, string>,
): Array<GuardBout & { why: string }> {
  const out: Array<GuardBout & { why: string }> = []
  const byAthlete = new Map<string, GuardBout[]>()
  for (const b of bouts) byAthlete.set(b.athlete_id, [...(byAthlete.get(b.athlete_id) ?? []), b])

  for (const [athleteId, list] of byAthlete) {
    const a = athletes.get(athleteId)
    if (!a) continue
    const home = String(a.state ?? "").toUpperCase()
    // A gender mismatch is evidence only when he has bouts of his own gender: Taina Fernandez's
    // profile said Male while every bout of hers was in the girls' brackets - the profile was wrong.
    const hasOwnGender = list.some((b) => sex(b.gender) && sex(b.gender) === sex(a.gender))
    const identity = identityByAthlete.get(athleteId) ?? null
    const verdict = (b: GuardBout) => aliases.get(aliasKey(b.athlete_name, b.athlete_club))
    const linkedToHim = (b: GuardBout) => {
      const v = verdict(b)
      return v?.status === "linked" && (!identity || !v.identityId || v.identityId === identity)
    }
    const clubOf = (b: GuardBout) => String(b.athlete_club ?? "").trim()
    const trusted = (b: GuardBout) => linkedToHim(b) || clubOf(b).toUpperCase() === home || schoolMatches(clubOf(b), a.highschool)

    // His weights by season, from the bouts we trust.
    const weightsBySeason = new Map<number, number[]>()
    for (const b of list) {
      const season = boutSeason(b)
      const w = weightOf(b)
      if (season == null || w == null || !trusted(b)) continue
      weightsBySeason.set(season, [...(weightsBySeason.get(season) ?? []), w])
    }

    /** "consistent" | "inconsistent" | null when there is nothing of his to compare with. */
    const weightVerdict = (b: GuardBout): { fits: boolean; ref: number } | null => {
      const w = weightOf(b)
      const season = boutSeason(b)
      if (w == null || season == null) return null
      const same = weightsBySeason.get(season)
      const near = [...(weightsBySeason.get(season - 1) ?? []), ...(weightsBySeason.get(season + 1) ?? [])]
      const ref = same?.length ? median(same) : near.length ? median(near) : null
      if (ref == null) return null
      if (w >= UPPER_WEIGHTS && ref >= UPPER_WEIGHTS) return { fits: true, ref }
      const below = same?.length ? BELOW : BELOW_NEIGHBOUR
      return { fits: w >= ref * (1 - below) && w <= ref * (1 + ABOVE), ref }
    }

    for (const b of list) {
      const club = clubOf(b).toUpperCase()
      const entry = `${a.name}|${club}`
      if (HELD_STATE_ENTRIES.has(entry)) continue
      if (verdict(b)?.status === "rejected") {
        out.push({ ...b, why: `rejected: ${b.athlete_club}` })
        continue
      }
      if (linkedToHim(b) || REVIEWED_STATE_ENTRIES.has(entry)) continue
      if (hasOwnGender && GENDERED_EVENT.test(b.event_key) && sex(b.gender) && sex(a.gender) && sex(b.gender) !== sex(a.gender)) {
        out.push({ ...b, why: "gender" })
        continue
      }
      if (trusted(b)) continue
      const weight = weightVerdict(b)
      if (weight && !weight.fits) {
        out.push({ ...b, why: `weight ${weightOf(b)}, he wrestled ${Math.round(weight.ref)} that season` })
        continue
      }
      // No weight to go on: only a far state on an NC wrestler. A bordering state is often his club's
      // (D'Ettore, SC), and a profile with no state has no home to differ from (Nate Gardner, Buford GA).
      if (/^[A-Z]{2}$/.test(club) && home === "NC" && club !== home && !NC_NEIGHBOURS.has(club) && !weight) out.push({ ...b, why: `entered for ${club}, no weight of his to compare` })
    }
  }
  return out
}
