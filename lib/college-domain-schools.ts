/**
 * Which college a coach account belongs to, derived from their `.edu` address.
 *
 * The `institution` field is filled in for 1 of 41 college coaches, and chasing the other 40
 * for a form field is not a plan. 34 of them signed up from a `.edu` address that names the
 * school outright — campbell.edu, roanoke.edu, umo.edu — so the domain is the answer, and it
 * is the same signal that auto-approved them in the first place.
 *
 * Only the school is ever shown to an athlete, never the coach. Most wrestling staffs are one
 * or two people, so this is not real anonymity and should not be sold as such — but it
 * reframes the thing honestly, as a *program* expressing interest rather than a named adult
 * watching a minor.
 */

/**
 * Domains that do not read as a school name on their own.
 *
 * Every `.edu` domain currently in use by a coach account is listed, because the fallback
 * turns "su.edu" into "Su" and "wlu.edu" into "Wlu" — which name no college a family has
 * heard of. New domains fall back to the label and should be added here when they appear.
 */
const DOMAIN_SCHOOL_NAMES: Record<string, string> = {
  "allenuniversity.edu": "Allen University",
  "andrewcollege.edu": "Andrew College",
  "appstate.edu": "Appalachian State",
  "averett.edu": "Averett University",
  "bac.edu": "Bluefield College",
  "belmontabbeycollege.edu": "Belmont Abbey",
  "brevard.edu": "Brevard College",
  "campbell.edu": "Campbell University",
  "catawba.edu": "Catawba College",
  "coker.edu": "Coker University",
  "concord.edu": "Concord University",
  "ecu.edu": "East Carolina",
  "emoryhenry.edu": "Emory & Henry",
  "erskine.edu": "Erskine College",
  "ferrum.edu": "Ferrum College",
  "gardner-webb.edu": "Gardner-Webb",
  "glenville.edu": "Glenville State",
  "greensboro.edu": "Greensboro College",
  "lander.edu": "Lander University",
  "lenoirrhyne.edu": "Lenoir-Rhyne",
  "liberty.edu": "Liberty University",
  "limestone.edu": "Limestone University",
  "lynchburg.edu": "University of Lynchburg",
  "mars-hill.edu": "Mars Hill",
  "mercyhurst.edu": "Mercyhurst University",
  "methodist.edu": "Methodist University",
  "montreat.edu": "Montreat College",
  "mountunion.edu": "Mount Union",
  "ncat.edu": "NC A&T",
  "ncsu.edu": "NC State",
  "newberry.edu": "Newberry College",
  "pfeiffer.edu": "Pfeiffer University",
  "queens.edu": "Queens University",
  "randolphcollege.edu": "Randolph College",
  "rit.edu": "RIT",
  "roanoke.edu": "Roanoke College",
  "su.edu": "Shenandoah University",
  "umo.edu": "University of Mount Olive",
  "unc.edu": "North Carolina",
  "uncg.edu": "UNC Greensboro",
  "uncp.edu": "UNC Pembroke",
  "wcu.edu": "Western Carolina",
  "wlu.edu": "Washington & Lee",
}

/** Lowercased domain of an email address, or null. */
export function emailDomain(email: string | null | undefined): string | null {
  const value = String(email ?? "").trim().toLowerCase()
  const at = value.lastIndexOf("@")
  if (at <= 0 || at === value.length - 1) return null
  const domain = value.slice(at + 1)
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ? domain : null
}

/** Turn "roanoke.edu" into "Roanoke" — the label before ".edu", title-cased. */
function schoolFromDomain(domain: string): string {
  const label = domain.replace(/\.edu$/, "").split(".").filter(Boolean).pop() ?? domain
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-")
}

/**
 * The school to show an athlete.
 *
 * A stored `institution` wins — somebody typed it deliberately. Otherwise the `.edu` domain
 * is used, via the lookup for the ones that are abbreviations. A non-`.edu` address returns
 * null rather than a guess: "Gmail" is not a college, and a wrong school name on a
 * recruiting notification is worse than a vague one.
 */
export function collegeForCoach(params: {
  institution?: string | null
  email?: string | null
}): string | null {
  const stated = String(params.institution ?? "").trim()
  if (stated) return stated

  const domain = emailDomain(params.email)
  if (!domain || !domain.endsWith(".edu")) return null

  return DOMAIN_SCHOOL_NAMES[domain] ?? schoolFromDomain(domain)
}
