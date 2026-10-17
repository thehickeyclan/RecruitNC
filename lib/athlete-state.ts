/**
 * Which state's wrestlers a board, roster or ranking is about.
 *
 * Rankings, the public board and the coach roster each filtered on `is_nc_athlete` — a boolean.
 * That answered the only question the product had while it was North Carolina alone, and answers
 * nothing once a second state arrives: a South Carolina profile is either true, and lands in NC's
 * rankings and every coach's roster, or false, and cannot be found anywhere. Placer profiles are
 * being minted for every state (Matt, 14 Oct 2026), so the boolean had to become a place.
 *
 * `athletes.state` now carries it. It was null on 860 of 1,334 rows until
 * `scripts/backfill-athlete-state.ts` wrote it from `is_nc_athlete`, and that script prints the
 * equivalence this file depends on: `state = 'NC'` selects exactly the 1,305 rows
 * `is_nc_athlete = true` selected. Nothing about today's boards moves.
 *
 * `is_nc_athlete` is left in place and still means what it says — a wrestler who left the state
 * has it false (Jack Harty, Greens Farms Academy) and keeps a null state rather than a guessed one.
 */

/** The state the product was built in, and the default for every surface that does not name one. */
export const HOME_STATE = "NC"

/**
 * Restrict an `athletes` query to one state.
 *
 * Takes the query so each caller keeps its own columns and ordering, and so a surface that gains a
 * state parameter needs one word changed rather than a new query. A caller passing nothing gets
 * the home state, which is what every caller wants today.
 */
export function inState<T>(query: T, state: string = HOME_STATE): T {
  return (query as { eq: (column: string, value: string) => T }).eq("state", normalizeState(state))
}

/** Upper-cased two-letter code; a blank or unrecognisable value falls back to the home state. */
export function normalizeState(state: string | null | undefined): string {
  const v = String(state ?? "").trim().toUpperCase()
  return /^[A-Z]{2}$/.test(v) ? v : HOME_STATE
}

/**
 * Every state we can hold a wrestler for, as code and name.
 *
 * The list is the whole country rather than the states we have loaded, because a family signs up
 * before we have their state's data and the alternative is telling them their state does not
 * exist. `state_tournament_placers` already carries 49 states; the gap is profiles, not states.
 */
export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
]

const NAME_BY_CODE = new Map(US_STATES.map((s) => [s.code, s.name]))

/** "SC" -> "South Carolina". An unknown code is returned as given, never blanked. */
export function stateName(code: string | null | undefined): string {
  const v = String(code ?? "").trim().toUpperCase()
  return NAME_BY_CODE.get(v) ?? v
}

/**
 * Whether a profile belongs to the state the product calls home.
 *
 * `is_nc_athlete` is kept in step with this on write. It defaults to TRUE in the database, which
 * is why it cannot be trusted on a row nobody set it on: every profile a family created was
 * stamped North Carolina whatever state they live in, and before any of this that was invisible
 * because North Carolina was the only state there was.
 */
export function isHomeState(state: string | null | undefined): boolean {
  return String(state ?? "").trim().toUpperCase() === HOME_STATE
}

/**
 * The body that runs a state's high school championship, for labelling a credential.
 *
 * "NCHSAA 4A State Champion" is the right label in North Carolina and a false one in South
 * Carolina, whose public championship is the SCHSL's — and both states have a 4A, so the
 * classification alone cannot tell them apart. A coach reading "4A State Champion" on a profile
 * with no state cannot tell which title he is looking at, which is the whole reason the state
 * has to appear.
 *
 * Independent schools wrestle their own championship, named separately, because that is the
 * credential: NCISA in North Carolina, SCISA in South Carolina.
 */
const ASSOCIATIONS: Record<string, { public: string; independent?: string }> = {
  NC: { public: "NCHSAA", independent: "NCISA" },
  SC: { public: "SCHSL", independent: "SCISA" },
}

/**
 * How to name a state championship on a credential card.
 *
 * `classification` is the division as the result carries it, and is what says whether the
 * wrestler was at the independent-schools championship ("NCISA", "SCISA"). A state we hold no
 * association for is named by the state itself — "Georgia State Champion" is honest and
 * unambiguous, which is the bar; inventing an acronym is not.
 */
export function stateChampionshipName(
  state: string | null | undefined,
  classification?: string | null,
): string {
  const code = String(state ?? "").trim().toUpperCase()
  const assoc = ASSOCIATIONS[code]
  const cls = String(classification ?? "")
  if (assoc?.independent && new RegExp(`^${assoc.independent}`, "i").test(cls.trim())) {
    return assoc.independent
  }
  return assoc?.public ?? (stateName(code) || code)
}
