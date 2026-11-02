/**
 * The college a commitment names, resolved against our own program data.
 *
 * Flo writes the college the way a recruiting writer would - "Penn", "NC State", "Augustana
 * (IL)", "Cal Poly" - and those strings are what land on a profile today. Resolving them against
 * lib/college-programs/programs-2026-27.json means a commitment carries the division and
 * conference we already hold rather than a label parsed out of free text, and that the same
 * school is one school however the list spelled it that week.
 *
 * A name that resolves to nothing is kept exactly as Flo wrote it and reported. Guessing which
 * of 436 programs "Penn" means - Penn, Penn State, Pennsylvania College of Technology - is how a
 * wrestler ends up committed to the wrong school on his own profile, so the unresolved ones go
 * in the run report for a person to alias.
 */
import programs from "@/lib/college-programs/programs-2026-27.json"
import { nameKey, schoolKeys } from "@/lib/college-programs/match"

type ProgramSchool = {
  id: string
  name: string
  state: string
  programs: Array<{ division: string; mens?: boolean; womens?: boolean; conference?: string }>
}

export type ResolvedCollege = {
  /** What to store: the program list's name when it resolved, Flo's own string when it did not. */
  name: string
  resolved: boolean
  schoolId: string | null
  state: string | null
  division: string | null
  conference: string | null
}

/**
 * Spellings the program list does not answer to on its own.
 *
 * Only names whose formal entry cannot be reached by key: an abbreviation a writer uses ("Penn"
 * for the University of Pennsylvania) or a campus the list files under its system name. Each one
 * is a decision about identity, so each is written down rather than inferred.
 */
const US_STATE_SUFFIX = /\s*\((A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\)\s*$/i

/**
 * Things in the college column that are not a college.
 *
 * Flo's women's list uses the column to say what a ranked wrestler is doing next, and "Not
 * Competing" is one of the answers. Written to a profile it would read as a commitment to a
 * school called Not Competing and would take her off every coach's uncommitted board. A sport
 * qualifier - "Cal Poly - Track & Field" - is the other: a real college, and not wrestling, so
 * it is not a wrestling commitment and is held rather than quietly recorded as one.
 */
const NOT_A_WRESTLING_COMMITMENT = /^(not competing|undecided|uncommitted|n\/?a|tbd)$|\s[-–]\s(track|football|soccer|softball|rugby|judo)/i

export function isWrestlingCommitment(raw: string): boolean {
  return Boolean(String(raw ?? "").trim()) && !NOT_A_WRESTLING_COMMITMENT.test(String(raw).trim())
}

const ALIASES: Record<string, string> = {
  unc: "University of North Carolina at Chapel Hill (North Carolina)",
  pitt: "University of Pittsburgh",
  "army west point": "United States Military Academy (Army)",
  siue: "Southern Illinois University Edwardsville (SIU Edwardsville or SIUE)",
  ndsu: "North Dakota State University",
  sdsu: "South Dakota State University",
  swocc: "Southwestern Oregon Community College",
  "app state": "Appalachian State University",
}

/*
 * California Baptist and Indiana Tech are not aliases: neither is on our 2026-27 program list,
 * and both take commitments on Flo's women's list. They stay unresolved and get reported each
 * run, which is the signal to check the program list rather than to invent an entry here.
 */

const SCHOOLS = (programs as { schools: ProgramSchool[] }).schools

const BY_KEY = (() => {
  const map = new Map<string, ProgramSchool>()
  const add = (key: string, school: ProgramSchool) => {
    if (key && !map.has(key)) map.set(key, school)
  }
  for (const school of SCHOOLS) {
    for (const key of schoolKeys(school.name)) {
      add(key, school)
      /*
       * Recruiting writers drop "Community" from a junior college - "Iowa Lakes", "Indian Hills",
       * "Hawkeye CC" - and the formal name keeps it. One extra key per school costs nothing and
       * saves aliasing every juco in the country one at a time.
       */
      add(key.replace(/\bcommunity\b/g, "").replace(/\s+/g, " ").trim(), school)
    }
  }
  return map
})()

/** The spellings to try for one written name, strongest first. */
function candidateKeys(given: string): string[] {
  const plain = given.replace(US_STATE_SUFFIX, "").trim()
  const spellings = new Set<string>([given, plain])
  for (const base of [given, plain]) {
    spellings.add(base.replace(/\bSt\.(?=\s|$)/g, "State"))
    spellings.add(base.replace(/\bCC\b/g, "Community College"))
    spellings.add(base.replace(/\bSt\.(?=\s|$)/g, "State").replace(/\bCC\b/g, "Community College"))
  }
  const keys: string[] = []
  for (const spelling of spellings) {
    const key = nameKey(spelling)
    if (!key) continue
    const alias = ALIASES[key]
    if (alias) keys.push(nameKey(alias))
    keys.push(key)
  }
  return [...new Set(keys)]
}

export function resolveCommitmentCollege(raw: string): ResolvedCollege {
  const given = String(raw ?? "").trim()
  if (!given) return { name: "", resolved: false, schoolId: null, state: null, division: null, conference: null }
  const school = candidateKeys(given)
    .map((key) => BY_KEY.get(key))
    .find(Boolean)
  if (!school) return { name: given, resolved: false, schoolId: null, state: null, division: null, conference: null }
  const program = school.programs[0]
  return {
    name: school.name,
    resolved: true,
    schoolId: school.id,
    state: school.state ?? null,
    division: program?.division ?? null,
    conference: program?.conference ?? null,
  }
}
