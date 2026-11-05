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
 * credential: NCISA in North Carolina, SCISA in South Carolina. A state can run more than one -
 * Maryland has both the MIS state tournament and the MIAA league - so they are a list, and the
 * classification on the result says which one he was at.
 *
 * West Virginia has none: the WVSSAC has included private schools in its own brackets since
 * 1979, so there is no separate championship to name.
 */
/*
 * `girls` is a SECOND PUBLIC championship, for the states that run one. Iowa's girls wrestle the
 * IGHSAU and its boys the IHSAA - two public bodies, not a public one and a private one.
 *
 * It is deliberately not folded into `independent`, although that list would have made
 * `stateChampionshipName` return the right name. `isIndependentChampionship` reads `independent`
 * to decide whether a 7th or 8th grade placement is legitimate, because independent schools roster
 * middle-schoolers and public ones do not - so calling the IGHSAU independent would have switched
 * off that namesake check for every girl in the state.
 */
const ASSOCIATIONS: Record<
  string,
  {
    public: string
    girls?: string
    independent?: string[]
    middleSchoolVarsity?: true
    /**
     * Independent schools that wrestle INSIDE the state association, as its own classification
     * rather than a separate championship. Tennessee's TSSAA Division II is McCallie, Baylor, MBA,
     * Brentwood Academy and Knoxville Catholic - private schools whose rows carry association
     * "TSSAA" and classification "DII", so an association-keyed check cannot see them.
     */
    independentClassifications?: string[]
  }
> = {
  NC: { public: "NCHSAA", independent: ["NCISA"] },
  SC: { public: "SCHSL", independent: ["SCISA"] },
  VA: { public: "VHSL", independent: ["VISAA"] },
  MD: { public: "MPSSAA", independent: ["MIS", "MIAA"] },
  WV: { public: "WVSSAC" },
  DE: { public: "DIAA" },
  /*
   * Georgia's private association is GIAA, not GISA: it renamed in 2022, and every 2024-26 event
   * we hold ran under the new name (Muse, 24 Oct 2026). Using the old one would mislabel every
   * Georgia private-school title.
   */
  GA: { public: "GHSA", independent: ["GIAA"] },
  TN: { public: "TSSAA" },
  FL: { public: "FHSAA" },
  AL: { public: "AHSAA" },
  LA: { public: "LHSAA" },
  MS: { public: "MHSAA" },
  KY: { public: "KHSAA" },
  IN: { public: "IHSAA" },
  NJ: { public: "NJSIAA" },
  NY: { public: "NYSPHSAA" },
  CT: { public: "CIAC" },
  MA: { public: "MIAA" },
  RI: { public: "RIIL" },
  NH: { public: "NHIAA" },
  VT: { public: "VPA" },
  ME: { public: "MPA" },
  /*
   * Pennsylvania runs two championships, and PIAA is not the one the prep schools wrestle.
   * Berks Catholic, Bishop McCort and Faith Christian are PIAA members and wrestle its brackets;
   * Malvern Prep, Haverford School, Episcopal Academy, Penn Charter and Mercersburg are not, and
   * crown their own champion at the PAISWT. We hold 520 PAISWT rows (imported 6 Oct 2026) with no
   * name-and-season overlap with PIAA at all - two separate fields, not two spellings of one.
   */
  PA: { public: "PIAA", independent: ["PAISWT"] },
  /*
   * Texas runs four championships, not two: the UIL for public schools, and three private layers
   * that crown their own champions - TAPPS, Texas Prep State and the SPC. The association strings
   * are the payloads' own ("TX Prep State"), matched case-insensitively here.
   */
  TX: { public: "UIL", independent: ["TAPPS", "TX Prep State", "SPC"] },
  /*
   * Arkansas has one layer. Central Arkansas Christian, Catholic High School For Boys, Shiloh
   * Christian and Pulaski Academy are AAA members and wrestle its brackets, so unlike PA and TX
   * there is no independent championship to name.
   */
  AR: { public: "AAA" },
  /*
   * Oklahoma has one layer too. Bishop McGuinness, Casady and Cascia Hall are OSSAA members and
   * wrestle its brackets, so there is no independent championship to name.
   */
  OK: { public: "OSSAA" },
  /*
   * Iowa is the first state with a separate girls championship body. Its private schools compete
   * inside both associations, so there is no independent layer to name.
   */
  IA: { public: "IHSAA", girls: "IGHSAU" },
  /* Missouri's private schools compete inside MSHSAA, and its girls wrestle it too - one layer. */
  MO: { public: "MSHSAA" },
  /* Michigan's private schools wrestle inside the MHSAA, and so do its girls - one layer. */
  MI: { public: "MHSAA" },
  /*
   * Minnesota's private schools wrestle inside the MSHSL, and so do its girls - one layer. Unlike
   * every state above it, the MSHSL lets 7th and 8th graders wrestle varsity and place at state:
   * the 2024 bracket prints carry grade 7 and grade 8 against class years of 2029 and 2028 (Cayden
   * Neisen, Grayson Eggum). So a pre-freshman placement here is ordinary, not a namesake - which is
   * `middleSchoolVarsity`, NOT `independent`: these are public schools and calling them independent
   * would be false in every other reader.
   */
  MN: { public: "MSHSL", middleSchoolVarsity: true },
  /*
   * Tennessee runs one association over three boys classifications plus girls: A, AA and DII, where
   * DII is the private-school division. It shows in the data - 13 of the 504 DII placements sit
   * before the wrestler's freshman year, against 0 of AA's 672 and 0 of the 440 girls rows.
   */
  TN: { public: "TSSAA", independentClassifications: ["DII"] },
}

/**
 * Events that are NOT a state championship, however they are stored.
 *
 * West Virginia's girls wrestled a state INVITATIONAL in 2024, 2025 and 2026: the WVSSAC does
 * not sanction girls' wrestling until 2026-27, so calling one of those titles a WVSSAC state
 * championship would credit a girl with something her state did not award. The event is real and
 * worth showing - it is simply not a championship, and the card has to say so.
 */
const NOT_A_CHAMPIONSHIP: Record<string, RegExp> = {
  WV: /girls\s*invitational/i,
}

/**
 * Does this association run a state's independent-schools championship?
 *
 * Asked of the row's `association`, not of its classification text. Callers used to test the
 * classification, or a `/(ISA|VISAA)$/` suffix on the association, and both miss Pennsylvania:
 * PAISWT neither ends in "ISA" nor prints its name in a classification, which is always "Open".
 * The consequence was not cosmetic - the launch gate counts a pre-freshman placement as a
 * namesake or a wrong class unless the tournament is an independent one, where 7th and 8th
 * graders wrestle varsity legitimately, so five PAISWT middle-schoolers read as five errors.
 */
/**
 * The slug a state championship's bouts are keyed under, which must not collide between states.
 *
 * Two pairs of states share an association acronym: Indiana and Iowa are both the IHSAA, and
 * Mississippi and Michigan are both the MHSAA. Bout event keys were `<association>-states-<season>`
 * with no state in them, so Michigan's import was aimed straight at Mississippi's 767 rows for
 * 2026 - caught only because the importer had learned that morning to measure what it replaces.
 *
 * The state code goes in front ONLY where the acronym is shared, so the 113 keys that are already
 * unambiguous keep the names they have and nothing else needs migrating. A new state that collides
 * with an existing one is disambiguated automatically, without anyone having to notice.
 */
export function championshipKeySlug(state: string | null | undefined, association: string | null | undefined): string {
  const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const assoc = slug(String(association ?? ""))
  if (!assoc) return assoc
  const code = String(state ?? "").trim().toUpperCase()
  const sharers = Object.entries(ASSOCIATIONS).filter(([, v]) =>
    [v.public, v.girls, ...(v.independent ?? [])].filter(Boolean).some((n) => slug(String(n)) === assoc),
  )
  if (sharers.length < 2) return assoc
  return code ? `${code.toLowerCase()}-${assoc}` : assoc
}

export function isIndependentChampionship(
  state: string | null | undefined,
  association: string | null | undefined,
): boolean {
  const code = String(state ?? "").trim().toUpperCase()
  const name = String(association ?? "").trim()
  if (!name) return false
  return (ASSOCIATIONS[code]?.independent ?? []).some((x) => x.toLowerCase() === name.toLowerCase())
}

/**
 * Whether this classification is the state association's own independent-school division - private
 * schools that roster middle-schoolers, inside the public body rather than beside it.
 */
export function isIndependentClassification(
  state: string | null | undefined,
  classification: string | null | undefined,
): boolean {
  const code = String(state ?? "").trim().toUpperCase()
  const name = String(classification ?? "").trim().toLowerCase()
  if (!name) return false
  return (ASSOCIATIONS[code]?.independentClassifications ?? []).some((x) => x.toLowerCase() === name)
}

/**
 * Whether a 7th or 8th grade varsity placement is legitimate in this championship, rather than
 * evidence of a namesake or a wrong class year. Two different reasons it can be: an independent
 * association whose schools roster middle-schoolers (NCISA, SCISA, VISAA), or a state association
 * that permits it outright (the MSHSL). Anything earlier than 7th grade is wrong everywhere.
 */
export function allowsMiddleSchoolVarsity(
  state: string | null | undefined,
  association: string | null | undefined,
  classification?: string | null,
): boolean {
  if (isIndependentChampionship(state, association)) return true
  if (isIndependentClassification(state, classification)) return true
  const code = String(state ?? "").trim().toUpperCase()
  const entry = ASSOCIATIONS[code]
  if (!entry?.middleSchoolVarsity) return false
  const name = String(association ?? "").trim().toLowerCase()
  if (!name) return false
  // Only that state's own championships - never a visiting association's rows filed under it.
  return [entry.public, entry.girls, ...(entry.independent ?? [])]
    .filter(Boolean)
    .some((x) => String(x).toLowerCase() === name)
}

/** "WV Girls State Invitational" — the event's own name, where it is not a championship. */
export function invitationalName(state: string | null | undefined, classification?: string | null): string | null {
  const code = String(state ?? "").trim().toUpperCase()
  const pattern = NOT_A_CHAMPIONSHIP[code]
  if (!pattern || !pattern.test(String(classification ?? ""))) return null
  return `${code} Girls State Invitational`
}

/**
 * The association a state-championship row belongs to, read from the event text: an independent
 * schools' championship when the event names it ("VISAA"), else the state's public association
 * ("VHSL"), else the state itself. A Virginia champion was called an NCHSAA one (Reza Massjouni,
 * 3 Nov 2026).
 */
export function associationForEvent(state: string | null | undefined, event: string | null | undefined): string {
  const code = String(state ?? "").trim().toUpperCase()
  const assoc = ASSOCIATIONS[code]
  const text = String(event ?? "")
  const own = assoc?.independent?.find((name) => new RegExp(`\\b${name}\\b`, "i").test(text))
  if (own) return own
  return assoc?.public ?? (stateName(code) || code)
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
  association?: string | null,
): string {
  const code = String(state ?? "").trim().toUpperCase()
  const assoc = ASSOCIATIONS[code]
  const cls = String(classification ?? "")
  /*
   * The row's own `association` decides when it has one. Reading the body out of the
   * classification only works where the independent tournament prints its name there, as NCISA
   * and SCISA do; Pennsylvania's PAISWT rows carry the classification "Open", so a Malvern Prep
   * placer read from the classification alone comes back "PIAA" - a championship his school is
   * not eligible for.
   */
  const stated = String(association ?? "").trim()
  const named = [assoc?.girls, ...(assoc?.independent ?? [])].filter(Boolean) as string[]
  if (stated && named.some((name) => name.toLowerCase() === stated.toLowerCase())) return stated
  const own = assoc?.independent?.find((name) => new RegExp(`^${name}`, "i").test(cls.trim()))
  if (own) return own
  return assoc?.public ?? (stateName(code) || code)
}
