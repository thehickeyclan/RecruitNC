/**
 * The name an entrant chooses for the pool leaderboard.
 *
 * A first name alone cannot tell 17 Michaels apart; a first name and a last initial still leaves
 * six people showing as "Jekai S." — and puts part of a child's real name on a board. Letting
 * people pick solves both, but a box anybody can type into and have appear beside minors' names
 * needs its rules written down where they can be read and tested.
 *
 * Three things are refused. Impersonating a wrestler in the field, because "Jekai Sedgwick" on
 * the leaderboard is a claim about a real boy. Sounding official, because "NC United" carries the
 * event's authority. And the obvious ugliness, which is screened but not solved here — a person
 * with a reset button is the backstop, not this list.
 */

export const DISPLAY_NAME_MIN = 3
export const DISPLAY_NAME_MAX = 20

/** Letters, digits, spaces and the punctuation real nicknames use. */
const ALLOWED = /^[A-Za-z0-9 '\-_]+$/

const RESERVED = [
  "ncunited", "ncwrestlingunited", "recruitnc", "tournamentofchampions", "toc",
  "admin", "administrator", "moderator", "mod", "official", "officials", "staff",
  "referee", "ref", "support", "help", "system", "root", "null", "undefined",
  "anonymous", "entrant", "nculeaderboard", "ncuadmin",
]

// Two lists, because one is not safe. Some words can be matched anywhere in a name: no innocent
// name contains them. Others are ordinary words or surnames with something rude inside — Cassidy,
// Dickinson, Cumberland, Scunthorpe — and those may only be refused when they stand as a word of
// their own. Matching the second list anywhere is the Scunthorpe problem, and it insults real
// people by name.
//
// Both lists stay short and blunt. A longer one gives false comfort: the admin reset is what
// actually covers a board beside minors' names.
const PROFANITY_ANYWHERE = [
  "fuck", "shit", "asshole", "bitch", "whore", "slut", "rape", "rapist", "molest",
  "pedo", "nigger", "nigga", "faggot", "tranny", "kike", "chink", "nazi", "hitler", "kkk",
]

const PROFANITY_WHOLE_WORD = [
  "cunt", "dick", "cock", "ass", "arse", "anal", "cum", "jizz", "fag", "twat",
  "prick", "penis", "vagina", "porn", "spic", "retard", "wanker", "bastard",
]

/**
 * One spelling for comparison: lower case, no punctuation, and the digit-for-letter swaps people
 * reach for first. "Sh1t_Head" and "shithead" must not be two different names.
 */
export function normalizeDisplayName(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "")
}

/** The key uniqueness is enforced on: two people cannot both be "Hammer". */
export function displayNameKey(name: string): string {
  return String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

export type DisplayNameCheck = { ok: true; name: string; key: string } | { ok: false; error: string }

/**
 * Whether a chosen name may go on the board.
 *
 * `fieldNames` are the wrestlers in the announced field. Passing them is what stops somebody
 * entering as a boy who is actually competing.
 */
export function validateDisplayName(input: unknown, fieldNames: readonly string[] = []): DisplayNameCheck {
  const name = String(input ?? "").trim().replace(/\s+/g, " ")

  if (name.length < DISPLAY_NAME_MIN) return { ok: false, error: `Use at least ${DISPLAY_NAME_MIN} characters.` }
  if (name.length > DISPLAY_NAME_MAX) return { ok: false, error: `Keep it to ${DISPLAY_NAME_MAX} characters or fewer.` }
  if (!ALLOWED.test(name)) return { ok: false, error: "Letters, numbers, spaces, hyphens and underscores only." }

  const flat = normalizeDisplayName(name)
  if (flat.length === 0) return { ok: false, error: "Use at least a few letters." }

  if (RESERVED.includes(flat)) return { ok: false, error: "That name is reserved. Pick another." }
  if (PROFANITY_ANYWHERE.some((word) => flat.includes(normalizeDisplayName(word)))) {
    return { ok: false, error: "That name will not work here. Pick another." }
  }

  // Split on everything that is not a letter, so "Big_D1ck" gives up "dick" while "Dickinson"
  // stays one word and survives.
  const words = name.toLowerCase().split(/[^a-z0-9]+/i).map(normalizeDisplayName).filter(Boolean)
  if (words.some((word) => PROFANITY_WHOLE_WORD.includes(word)) || PROFANITY_WHOLE_WORD.includes(flat)) {
    return { ok: false, error: "That name will not work here. Pick another." }
  }

  // A wrestler in the field is a real person whose name is not available to somebody else.
  const impersonated = fieldNames.some((athlete) => {
    const target = normalizeDisplayName(athlete)
    return target.length >= 6 && target === flat
  })
  if (impersonated) {
    return { ok: false, error: "That is a wrestler in the field. Use a name of your own." }
  }

  return { ok: true, name, key: displayNameKey(name) }
}

/** "Matthew Hickey" → "Matthew H." The fallback when somebody has not chosen a name. */
export function shortenRealName(fullName: string | null, fallback: string): string {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}
