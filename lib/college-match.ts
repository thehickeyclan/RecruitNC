/**
 * Which college a coach most likely belongs to, from what they typed and their email address.
 *
 * The `colleges` table stores short names ("Averett", "Appalachian State", "NC State") while coaches
 * type the formal one ("Averett University") and sign up on the school's domain (averett.edu).
 * Exact-name matching found almost nothing, so staff scrolled a 60-row dropdown for every coach.
 */

export type CollegeLike = { id: string; name: string; division?: string | null }

const STOPWORDS = new Set(["college", "university", "univ", "of", "the", "at", "and", "state"])

/** Lowercase words, "&" read as "and", punctuation gone. */
export function collegeWords(value: string | null | undefined): string[] {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    // A bracketed abbreviation is a label, not part of the name: "Rochester Institute of Technology (RIT)".
    .replace(/\([^)]*\)/g, " ")
    // "North Carolina State University" and "NC State" are one school.
    .replace(/\bnorth carolina\b/g, "nc")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

/** The distinctive words: what is left once "College", "University", "of" and so on are gone. */
function keyWords(value: string | null | undefined): string[] {
  return collegeWords(value).filter((w) => !STOPWORDS.has(w))
}

/** The part of an .edu address that names the school: "washjeff" from bmatthews@washjeff.edu. */
export function eduDomainLabel(email: string | null | undefined): string | null {
  const domain = String(email ?? "").trim().toLowerCase().split("@")[1] ?? ""
  if (!domain.endsWith(".edu")) return null
  const labels = domain.slice(0, -".edu".length).split(".").filter(Boolean)
  // mail.ncsu.edu -> ncsu: the school is the label nearest the TLD.
  return labels.length ? labels[labels.length - 1] : null
}

/**
 * Colleges on file that match, best first. Empty when nothing is a credible match - a wrong
 * suggestion that staff accept by reflex is worse than none.
 */
export function suggestColleges<T extends CollegeLike>(
  colleges: T[],
  hint: { institution?: string | null; email?: string | null },
): T[] {
  const typed = keyWords(hint.institution)
  const typedAll = collegeWords(hint.institution).join("")
  const domain = eduDomainLabel(hint.email)

  const scored: Array<{ college: T; score: number }> = []
  for (const college of colleges) {
    const words = keyWords(college.name)
    const allWords = collegeWords(college.name)
    if (!allWords.length) continue
    let score = 0

    /*
     * Every distinctive word of the college appears in what they typed - "Averett" in "Averett
     * University" - and those words are at least half of what they typed. Without the second
     * half, "NC Wrestling United" matched NC State and "Rochester Institute of Technology"
     * matched Rochester College on one shared word.
     */
    const shared = words.filter((w) => typed.includes(w)).length
    if (words.length && typed.length && shared === words.length && shared * 2 >= typed.length) {
      score += 10 + words.length
    }
    // Partial overlap only ranks; it never suggests on its own.
    const overlapBonus = shared * 2
    // The same name once spacing and "&"/"and" are ignored.
    if (typedAll && typedAll === allWords.join("")) score += 20

    // The email domain spells the name: averett.edu, campbell.edu, appstate.edu.
    if (domain) {
      const squashed = allWords.join("")
      const keySquashed = words.join("")
      if (domain === squashed || domain === keySquashed) score += 15
      else if (keySquashed.length >= 4 && (domain.startsWith(keySquashed) || keySquashed.startsWith(domain))) score += 8
    }

    if (score > 0) scored.push({ college, score: score + overlapBonus })
  }

  return scored.sort((a, b) => b.score - a.score || a.college.name.localeCompare(b.college.name)).map((s) => s.college)
}

/** Colleges whose name contains every word of the search, for the picker's search box. */
export function searchColleges<T extends CollegeLike>(colleges: T[], query: string): T[] {
  const words = collegeWords(query)
  if (!words.length) return colleges
  return colleges.filter((c) => {
    const name = collegeWords(c.name).join(" ")
    return words.every((w) => name.includes(w))
  })
}
