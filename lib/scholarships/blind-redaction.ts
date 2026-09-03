/**
 * Stripping identities out of what a blind reviewer reads.
 *
 * The structured fields — applicant, school, nominator, reference — are already withheld from
 * anyone who is not an admin. This is for the free text, where an applicant writes "my dad Justin
 * drove me every Saturday" and undoes the whole thing in one sentence.
 *
 * Everything the application holds about a person is turned into tokens: full names, every part of
 * them, email addresses, the local part of those addresses (which is usually a name), and phone
 * numbers in any punctuation. Matching is whole-word and case-insensitive.
 *
 * It cannot catch a name the application never recorded — a coach, a sibling, a teammate. Nothing
 * automatic can. Reviewers should be told that redaction is a floor, not a guarantee.
 */

const MIN_TOKEN = 3

/** "Justin Perry" → the whole thing, plus "Justin" and "Perry". Hyphens and apostrophes split too. */
export function personNameTokens(value: string | null | undefined): string[] {
  const normalized = value?.trim()
  if (!normalized) return []
  const parts = normalized
    .split(/[\s\-'’.]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= MIN_TOKEN)
  return [normalized, ...parts]
}

/** The address, and its local part, which is nearly always a name — "justin.usmc@yahoo.com". */
export function emailTokens(value: string | null | undefined): string[] {
  const email = value?.trim().toLowerCase()
  if (!email || !email.includes("@")) return []
  const local = email.split("@")[0] ?? ""
  const words = local.split(/[._\-+0-9]+/).filter((part) => part.length >= MIN_TOKEN)
  return [email, ...(local.length >= MIN_TOKEN ? [local] : []), ...words]
}

/** Ten digits however they were typed, so "(336) 555-0100" and "3365550100" both go. */
export function phoneTokens(value: string | null | undefined): string[] {
  const digits = (value ?? "").replace(/\D/g, "")
  if (digits.length < 10) return []
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(-10)
  return [
    ten,
    `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`,
    `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`,
    `${ten.slice(0, 3)}.${ten.slice(3, 6)}.${ten.slice(6)}`,
    `${ten.slice(0, 3)} ${ten.slice(3, 6)} ${ten.slice(6)}`,
  ]
}

/**
 * Words too ordinary to redact, even when a school or club is named after them.
 *
 * "Forge", "Pride" and "Combat" are club names and also words a wrestler writes about their own
 * training. Redacting them everywhere would leave essays unreadable, so a single-word institution
 * only counts when it is not a word anyone would otherwise use.
 */
const TOO_COMMON_TO_REDACT = new Set([
  "wrestling", "club", "academy", "high", "school", "county", "central", "east", "west", "north", "south",
  "forge", "pride", "combat", "elite", "united", "team", "athletics", "training", "center", "centre",
  "eagles", "panthers", "wildcats", "tigers", "bulldogs", "warriors", "spartans", "knights", "rebels",
])

/**
 * Schools and clubs named anywhere in the text, not only the one on the application.
 *
 * An essay saying "I drove to Belmont every Saturday" identifies the applicant in a state this
 * small, and the school on the form was somewhere else entirely. Names of two words or more are
 * taken whole; a single word only counts when it is distinctive enough not to be ordinary English.
 */
export function institutionTokens(names: readonly (string | null | undefined)[]): string[] {
  const tokens: string[] = []
  for (const raw of names) {
    const name = raw?.trim()
    if (!name || name.length < 4) continue

    const words = name.split(/\s+/).filter(Boolean)
    /** "Cardinal Gibbons High School" also goes as "Cardinal Gibbons". */
    const trimmed = words.filter((w) => !TOO_COMMON_TO_REDACT.has(w.toLowerCase()))

    /**
     * A club called nothing but an ordinary word — Forge, Pride, Combat — is not redacted at all.
     * Taking it would gut essays about forging character or wrestling with pride, and the word is
     * far more likely to be doing its ordinary work than naming the club.
     */
    if (trimmed.length === 0) continue

    if (words.length > 1) tokens.push(name)
    if (trimmed.length >= 2) tokens.push(trimmed.join(" "))
    /**
     * A one-word institution has to be long enough to be a place rather than a word. "South Point
     * High School" reduces to "Point", which ate "there was a point when he wanted to quit" out of
     * a real essay; Crest, Burns, Avery and Dixon are the same hazard. Seven characters keeps
     * Belmont and Cabarrus and drops all of those.
     */
    if (trimmed.length === 1 && trimmed[0].length >= 7) tokens.push(trimmed[0])
  }
  return tokens
}

/** Every identifying token an application holds, for redacting its own free text. */
export function identityTokensForApplication(app: {
  athlete_name?: string | null
  athlete_school?: string | null
  athlete_email?: string | null
  athlete_phone?: string | null
  nominator_name?: string | null
  nominator_email?: string | null
  nominator_phone?: string | null
  reference_name?: string | null
  reference_email?: string | null
  reference_phone?: string | null
}): string[] {
  return [
    ...personNameTokens(app.athlete_name),
    ...personNameTokens(app.athlete_school),
    ...emailTokens(app.athlete_email),
    ...phoneTokens(app.athlete_phone),
    ...personNameTokens(app.nominator_name),
    ...emailTokens(app.nominator_email),
    ...phoneTokens(app.nominator_phone),
    ...personNameTokens(app.reference_name),
    ...emailTokens(app.reference_email),
    ...phoneTokens(app.reference_phone),
  ]
}

export function redactApplicantIdentity(
  raw: string | null,
  identifiers: Array<string | null | undefined>,
): string | null {
  if (!raw) return null

  /** Longest first, so "Justin Perry" is replaced whole rather than leaving "[redacted] Perry". */
  const tokens = [...new Set(identifiers.flatMap((v) => (v?.trim() ? [v.trim()] : [])))].sort(
    (a, b) => b.length - a.length,
  )

  let redacted = raw
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    /**
     * `\b` fails against a token that starts or ends with punctuation — "(336) 555-0100" — so the
     * boundary is only asserted where the token's own edge is a word character.
     */
    const left = /^\w/.test(token) ? "\\b" : ""
    const right = /\w$/.test(token) ? "\\b" : ""
    redacted = redacted.replace(new RegExp(`${left}${escaped}${right}`, "gi"), "[redacted]")
  }
  return redacted
}
