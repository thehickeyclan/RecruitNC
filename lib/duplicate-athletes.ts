/**
 * Deciding when two athlete rows are one person, and which value wins when they disagree.
 *
 * Kept apart from the CLI in `scripts/merge-duplicate-athletes.ts` so the rules can be tested
 * without a database. They are the whole judgement in the merge: everything else is mechanical
 * repointing of the fifty-three tables that carry an `athlete_id`.
 */

/** First and last token. A nickname sits in the middle and must not key the group. */
export function firstLast(name: string): string {
  const parts = String(name ?? "")
    .toLowerCase()
    .replace(/[‘’“”"']/g, " ")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  return parts.length < 2 ? parts.join(" ") : `${parts[0]} ${parts[parts.length - 1]}`
}


/**
 * How much a row is worth keeping: information, and only information.
 *
 * A Tournament of Champions invitation deliberately carries no weight. The merge repoints
 * `toc_invitations` to whichever row survives, so the registration — and the payment on it —
 * follows the survivor either way. Scoring it would have kept Amanuel Kahsai's empty profile
 * over the one holding his 37 bouts and his NHSCA result, which is the exact wrong answer and
 * the reason he was rated one star.
 */
export function survivorScore(row: Record<string, unknown>, matchRows: number): number {
  const filled = Object.values(row).filter((v) => v !== null && v !== "" && !(Array.isArray(v) && !v.length)).length
  const claimed = row.claimed_by_user_id ? 200 : 0
  return filled + matchRows * 10 + claimed + (row.profile_verified ? 50 : 0)
}

/**
 * The few conflicts where the duplicate holds the truer value.
 *
 * - **A flag that is true beat a flag that is false.** These are all "this happened" markers —
 *   verified, matches uploaded, admin reviewed — and the event does not un-happen because a
 *   second row never heard about it.
 * - **A real NC United team beats "none".** The Blue signup is what created several of these
 *   duplicates in the first place, so the newer row is the one that knows he is Blue, and the
 *   older row's "none" is simply stale. Discarding it would drop a paying member's team.
 *
 * - **An apostrophe in a name beats the same name without one.** Two spellings that differ only
 *   by an apostrophe are one name typed two ways, and the one that has it is the name: a source
 *   drops or mangles the character, it does not invent it. D'Yonnee Hall of Woodruff arrived as
 *   "Dyonnee" on her 2026 placer row and "D'Yonnee" on her 2025 qualifier row, and the survivor
 *   is chosen by how much it holds, which would have printed her name wrong on her own profile.
 *   See normalizeApostrophes in lib/athlete-name-match.ts for the mangled forms this folds.
 *
 * Everything else stays a human decision and is printed rather than resolved. A prospect
 * ranking of 74 against 75 is a duplicate sitting in two slots at once, and which number to
 * keep is a question about the rankings, not about this merge.
 */
const apostrophed = (v: unknown) => /[\u2019']/.test(String(v ?? ""))
export function prefersDuplicate(column: string, keepValue: unknown, dupValue: unknown): boolean {
  if (typeof keepValue === "boolean" && typeof dupValue === "boolean") return dupValue && !keepValue
  if (/^(name|firstName|lastName|wrestling_name)$/.test(column)) {
    const bare = (v: unknown) => String(v ?? "").replace(/[\u2019']/g, "").toLowerCase()
    return bare(keepValue) === bare(dupValue) && apostrophed(dupValue) && !apostrophed(keepValue)
  }
  if (column === "ncUnitedTeam") {
    const stale = String(keepValue ?? "").trim().toLowerCase()
    const other = String(dupValue ?? "").trim().toLowerCase()
    return (stale === "none" || stale === "") && other !== "" && other !== "none"
  }
  return false
}

/**
 * Whether two profiles are one wrestler, and how sure that is.
 *
 * `firstLast` above is the key the merge used to group on, and it only ever met rows whose first
 * and last tokens were already identical. Every duplicate we have actually had to clean up by
 * hand failed that test in a different way:
 *
 *   - a nickname the source printed in quotes (`Steven \`Jett\` Johnson` / `Jett Johnson`,
 *     `Henry "Hank" Franklin` / `Henry Franklin`);
 *   - a first name one source shortens (Alex / Alexander Rodriguez, Wes / Wesley Files);
 *   - a surname one source joins, splits or truncates (Jerry Salazar-Mendoza / Salazar Mendoza,
 *     Easton Stikes / Stikes-Hampton);
 *   - a spelling that differs by a letter (Zoe / Zoey Wolford, Kailyn / Kailynn Penkov).
 *
 * What makes those safe to call one person is never the name on its own: it is the name plus a
 * school and a class year that agree. Two wrestlers of one name at one school in one class is
 * not a thing that happens; two Logan Browns in Maryland, at different schools in different
 * classes, is, and that pair has to come back null.
 *
 * "certain" is what the merge may act on. "likely" and "review" are for a person to read.
 */
import { getAthleteNameSearchVariants, namesReferToSamePerson, nameWords, schoolsLikelySame } from "@/lib/athlete-name-match"

export type DuplicateCandidate = {
  id: string
  name: string
  wrestling_name?: string | null
  highschool?: string | null
  state?: string | null
  graduationyear?: number | null
  gender?: string | null
}

export type DuplicateVerdict = { grade: "certain" | "likely" | "review"; why: string }

const letters = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "")
/* A quoted nickname is a token of its own and must not be read as a name part. */
const parts = (name: string) => nameWords(name).filter((w) => !/^['"`]|['"`]$/.test(w))
const firstToken = (name: string) => parts(name)[0] ?? ""
/** Every token after the first, joined: "Stikes-Hampton" and "Stikes Hampton" become one string. */
export const surnameRun = (name: string) => letters(parts(name).slice(1).join(""))

/** The blocking keys a pair must share before it is worth grading. */
export function duplicateBlockKeys(a: DuplicateCandidate): string[] {
  return [`f:${letters(firstToken(a.name)).slice(0, 4)}`, `l:${surnameRun(a.name).slice(0, 5)}`].filter((k) => k.length > 2)
}

const genderOf = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase()
  if (s.startsWith("f") || s.startsWith("w")) return "F"
  if (s.startsWith("m") || s.startsWith("b")) return "M"
  return null
}

/** Two first names one source would shorten: an alias group, or one a clear prefix of the other. */
function firstNamesAgree(a: string, b: string): boolean {
  const x = letters(firstToken(a))
  const y = letters(firstToken(b))
  if (!x || !y) return false
  if (x === y) return true
  if (x.length >= 3 && (y.startsWith(x) || x.startsWith(y))) return true
  return getAthleteNameSearchVariants(a).some((v) => letters(firstToken(v)) === y)
}

/** Surnames differing only in how the source joined, split or truncated them. */
function surnamesAgree(a: string, b: string): boolean {
  const x = surnameRun(a)
  const y = surnameRun(b)
  if (!x || !y) return false
  if (x === y) return true
  return (x.length >= 5 && y.startsWith(x)) || (y.length >= 5 && x.startsWith(y))
}

export function sameWrestler(a: DuplicateCandidate, b: DuplicateCandidate): DuplicateVerdict | null {
  const ga = genderOf(a.gender)
  const gb = genderOf(b.gender)
  /* A brother and a sister share a surname and a house. A stated disagreement ends it. */
  if (ga && gb && ga !== gb) return null
  if (a.state && b.state && String(a.state).toUpperCase() !== String(b.state).toUpperCase()) return null

  const sameName =
    namesReferToSamePerson(a.name, b.name) ||
    (a.wrestling_name ? namesReferToSamePerson(a.wrestling_name, b.name) : false) ||
    (b.wrestling_name ? namesReferToSamePerson(b.wrestling_name, a.name) : false)
  const nearName = firstNamesAgree(a.name, b.name) && surnamesAgree(a.name, b.name)
  if (!sameName && !nearName) return null

  const sameClass = a.graduationyear != null && a.graduationyear === b.graduationyear
  const classUnknown = a.graduationyear == null || b.graduationyear == null
  const schoolKnown = Boolean(String(a.highschool ?? "").trim() && String(b.highschool ?? "").trim())
  const schoolAgrees = schoolKnown && schoolsLikelySame(a.highschool ?? "", b.highschool ?? "")

  if (sameName && sameClass && schoolAgrees) return { grade: "certain", why: "same name, class and school" }
  if (nearName && sameClass && schoolAgrees) return { grade: "certain", why: "same school and class; one source writes the name differently" }
  if (sameName && sameClass && !schoolKnown) return { grade: "likely", why: "same name and class; one profile has no school" }
  if (sameName && classUnknown && schoolAgrees) return { grade: "likely", why: "same name and school; one profile has no class year" }
  if (nearName && sameClass && !schoolKnown) return { grade: "review", why: "near-identical name and same class; one profile has no school" }
  if (sameName && !sameClass && !classUnknown && schoolAgrees) return { grade: "review", why: "same name and school, different class years — one is wrong, or they are brothers" }
  if (sameName && sameClass && schoolKnown && !schoolAgrees) return { grade: "review", why: "same name and class, different schools — a transfer, or two wrestlers" }
  return null
}
