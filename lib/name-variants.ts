/**
 * The forms one wrestler's name takes across sources (Matt, 29 Oct 2026). Brackets carry the legal
 * name with its suffix ("Maximiliano Johnson", "Tyrone Norris III", "Billy Williams jr."); profiles
 * carry what the family typed ("Max Johnson", "Tyrone Norris", "Andrew P Lawson"). Exact matching
 * left 21 of 55 South Carolina Super 32 entrants off their profiles.
 *
 * `nameKeys` gives every key a name answers to: as written, without a suffix, without middle names
 * or initials, and with the first name's nicknames. Two names are the same person's only if their
 * keys meet - and that is evidence, never a link on its own: the linkers still require the name to
 * be unique, the team to be his state or school, and the weight to fit what he has made.
 */

/** First names and the names they stand for, both ways. */
const NICKNAME_GROUPS: string[][] = [
  ["alex", "alexander", "alexzander", "alejandro"],
  ["andy", "andrew", "drew"],
  ["ben", "benjamin", "benji"],
  ["billy", "bill", "will", "william", "liam", "willie"],
  ["bob", "bobby", "rob", "robbie", "robert", "bert"],
  ["cam", "cameron"],
  ["charlie", "charles", "chuck"],
  ["chris", "christopher", "topher"],
  ["dan", "danny", "daniel"],
  ["dave", "david"],
  ["ed", "eddie", "edward", "eduardo"],
  ["gabe", "gabriel"],
  ["greg", "gregory"],
  ["jake", "jacob"],
  ["jim", "jimmy", "james", "jamie"],
  ["joe", "joey", "joseph", "jose"],
  ["johnny", "john", "jon", "jonathan", "jonny"],
  ["josh", "joshua"],
  ["ken", "kenny", "kenneth"],
  ["larry", "lawrence"],
  ["matt", "matthew", "matty"],
  ["max", "maxwell", "maximilian", "maximiliano", "maximus", "massimo"],
  ["mike", "michael", "mikey"],
  ["nate", "nathan", "nathaniel"],
  ["nick", "nicholas", "nico", "nicolas"],
  ["pat", "patrick"],
  ["pete", "peter"],
  ["rich", "rick", "ricky", "richard", "ric"],
  ["ron", "ronnie", "ronald"],
  ["sam", "samuel", "sammy"],
  ["steve", "steven", "stephen"],
  ["ted", "teddy", "theodore", "theo"],
  ["tim", "timothy", "timmy"],
  ["tom", "tommy", "thomas"],
  ["tony", "anthony"],
  ["vince", "vincent"],
  ["zach", "zack", "zachary", "zachariah", "zak"],
]
const NICKNAMES = new Map<string, string[]>()
for (const group of NICKNAME_GROUPS) for (const n of group) NICKNAMES.set(n, group)

const SUFFIX = /^(jr|sr|ii|iii|iv|v)$/

/** Lower case, letters and spaces only: "D'Ettore" and "D?Ettore" alike, "jr." as "jr". */
export function normalizeName(name: unknown): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[’'`?.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Every key the name answers to. The first key is the name as written (normalised). */
export function nameKeys(name: unknown): string[] {
  const full = normalizeName(name)
  if (!full) return []
  let parts = full.split(" ")
  while (parts.length > 2 && SUFFIX.test(parts[parts.length - 1]!)) parts = parts.slice(0, -1)
  if (parts.length === 2 && SUFFIX.test(parts[1]!)) return [full]
  const first = parts[0]!
  const last = parts[parts.length - 1]!
  const keys = new Set<string>([full, parts.join(" "), `${first} ${last}`])
  for (const nick of NICKNAMES.get(first) ?? []) keys.add(`${nick} ${last}`)
  return [...keys]
}

/** How two names are the same person's: "exact", "variant" (suffix, middle name, nickname) or null. */
export function nameMatch(a: unknown, b: unknown): "exact" | "variant" | null {
  const ka = nameKeys(a)
  const kb = nameKeys(b)
  if (!ka.length || !kb.length) return null
  if (ka[0] === kb[0]) return "exact"
  const set = new Set(ka)
  return kb.some((k) => set.has(k)) ? "variant" : null
}
