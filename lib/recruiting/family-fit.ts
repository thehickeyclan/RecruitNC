/**
 * "Given my athletic ability, academic profile, finances and personal goals, which college is the
 * best fit for me, and how do my options compare?" (a parent's question, via Matt, 14 Oct 2026).
 *
 * The portal answers it in four parts, each worked out from facts and never guessed, and then
 * orders the family's colleges by how many parts fit. It never names "the right college": the
 * coach's interest, the visit and the money offer decide that, and none of them is in our data.
 *
 * - Athletic: the wrestler's best results so far against the North Carolina wrestlers who went to
 *   that level (lib/college-programs/went-here), five or more of them, or it says so.
 * - Academic: the level's eligibility minimum is the gate; GPA against the lowest of the NC
 *   wrestlers who went there (five or more); SAT/ACT ranges for all students are information,
 *   except at a highly selective college (academicFit).
 * - Finances: what families at their income paid, against their budget.
 * - Goals: intended major offered, distance from home, size and setting, against what they said.
 *
 * The family's profile is theirs: saved on their own account (auth user_metadata, which only they
 * and the service role can read), never shown to a coach, and the income is never saved at all.
 */
export type FitStatus = "fit" | "stretch" | "concern" | "unknown"
export type FitLine = { status: FitStatus; text: string }

export type FamilyFitProfile = {
  majors: string[]
  budget: number | null
  homeZip: string | null
  maxMiles: number | null
  size: "small" | "medium" | "large" | null
  settings: Array<"city" | "suburb" | "town" | "rural">
}

export const EMPTY_PROFILE: FamilyFitProfile = { majors: [], budget: null, homeZip: null, maxMiles: null, size: null, settings: [] }

/** Families of majors, by their federal two-digit codes, in a family's words. */
export const MAJOR_FAMILIES: Array<{ code: string; label: string }> = [
  { code: "52", label: "Business" },
  { code: "51", label: "Health professions and nursing" },
  { code: "31", label: "Kinesiology, exercise science and recreation" },
  { code: "26", label: "Biology" },
  { code: "14", label: "Engineering" },
  { code: "15", label: "Engineering technology" },
  { code: "11", label: "Computer science" },
  { code: "13", label: "Education" },
  { code: "43", label: "Criminal justice and public safety" },
  { code: "42", label: "Psychology" },
  { code: "45", label: "Social sciences" },
  { code: "09", label: "Communication and journalism" },
  { code: "27", label: "Mathematics" },
  { code: "40", label: "Physical sciences" },
  { code: "01", label: "Agriculture" },
  { code: "03", label: "Natural resources and environment" },
  { code: "04", label: "Architecture" },
  { code: "23", label: "English" },
  { code: "54", label: "History" },
  { code: "50", label: "Visual and performing arts" },
  { code: "44", label: "Public administration and social work" },
  { code: "24", label: "Liberal arts and general studies" },
]

const LABEL = new Map(MAJOR_FAMILIES.map((m) => [m.code, m.label]))

/** Cleans what the browser sent; anything not understood is dropped, never stored. */
export function cleanProfile(raw: unknown): FamilyFitProfile {
  const r = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown, max: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) && n > 0 && n <= max ? n : null
  }
  const zip = String(r.homeZip ?? "").trim()
  return {
    majors: (Array.isArray(r.majors) ? r.majors : []).map(String).filter((c) => LABEL.has(c)).slice(0, 3),
    budget: num(r.budget, 200_000),
    homeZip: /^\d{5}$/.test(zip) ? zip : null,
    maxMiles: num(r.maxMiles, 5_000),
    size: r.size === "small" || r.size === "medium" || r.size === "large" ? r.size : null,
    settings: (Array.isArray(r.settings) ? r.settings : []).filter((s): s is FamilyFitProfile["settings"][number] => ["city", "suburb", "town", "rural"].includes(String(s))),
  }
}

/** Great-circle miles. */
export function milesBetween(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLon = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)))
}

// ---- the four parts

type Standing = { tier: "state-champion" | "state-placer" | "state-qualifier" | "none"; national: boolean }
const RANK: Record<Standing["tier"], number> = { "state-champion": 3, "state-placer": 2, "state-qualifier": 1, none: 0 }
const score = (s: Standing) => RANK[s.tier] + (s.national ? 2 : 0)
const describe = (s: Standing) =>
  [s.tier === "state-champion" ? "a state champion" : s.tier === "state-placer" ? "a state placer" : s.tier === "state-qualifier" ? "a state qualifier" : null, s.national ? "a national placer" : null]
    .filter(Boolean)
    .join(" and ") || "no state or national placing yet"

/**
 * What programs at a level typically recruit, from the NC wrestlers who went there, and where the
 * wrestler is so far. Worded as a target to build toward, not a verdict (Matt, 14 Oct 2026): a
 * sophomore state qualifier read "Concern ... as good as 1 of the 38" against Division I, which is
 * true and useless. It says what the level looks for, then where the wrestler stands today.
 */
export function athleticFit(mine: Standing | null, group: Standing[], level: string, among: string, name = "Your wrestler"): FitLine {
  if (group.length < 5) return { status: "unknown", text: `Too few NC ${among} who went ${level} to say what its programs typically recruit (${group.length}).` }
  const n = group.length
  const champs = group.filter((g) => g.tier === "state-champion").length
  const placers = group.filter((g) => g.tier === "state-placer").length
  const national = group.filter((g) => g.national).length
  const sorted = group.map(score).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const typical = group.find((g) => score(g) === median) ?? group[0]
  const counts = [
    champs ? `${champs} of the ${n} NC ${among} who went ${level} were state champions` : null,
    placers ? `${placers}${champs ? " more" : ` of the ${n}`} placed at state` : null,
    national ? `${national} placed at a national tournament` : null,
  ].filter(Boolean)
  const want = `${level} programs typically want to see ${describe(typical)}: ${counts.length ? counts.join(", ") : `none of the ${n} placed at state on our records`}.`
  if (!mine) return { status: "unknown", text: `${want} ${name} has no results on file yet.` }
  const gap = median - score(mine)
  return { status: gap <= 0 ? "fit" : gap === 1 ? "stretch" : "concern", text: `${want} ${name} so far: ${describe(mine)}.` }
}

/**
 * Below this admit rate a college is highly selective: coaches there have little room to help a
 * recruited wrestler in admissions, so scores under the middle half of admitted students make it a
 * stretch. Everywhere else those ranges describe ALL students and are shown as information only
 * (Matt, 5 Nov 2026: App State, 89% admitted, told Gavin he lacked the grades). 15, not 20, on
 * purpose: under 15 is the Ivies, Stanford, Chicago, Duke, Northwestern, Hopkins, NYU, Williams and
 * Davidson; 15 to 20 is UNC, Virginia and Michigan, big athletic programs that do help recruits.
 */
export const HIGHLY_SELECTIVE_ADMIT_RATE = 15

/** The level's eligibility minimum, as lib/recruiting/eligibility-floor.ts reads it from the rules library. */
export type AcademicFloor = {
  levelName: string
  gpa: number | null
  coreCourses: boolean
  shortfall: string | null
  twoOfThree: { act: number; sat: number; gpa: number } | null
  none: string | null
}

const ALL_STUDENTS = "These numbers are for all students. Coaches can often help a recruited wrestler in admissions."

/**
 * Academic fit for a recruited wrestler, in three parts:
 * 1. The gate: the level's eligibility minimum. Below it is the only "concern".
 * 2. The NC wrestlers who went there: below the LOWEST of them is a stretch (half of any group is
 *    below its average and still got in, so the average is never the line).
 * 3. SAT/ACT against the middle half of all admitted students: information, except at a highly
 *    selective college (HIGHLY_SELECTIVE_ADMIT_RATE), where below it is a stretch.
 */
export function academicFit(input: {
  floor: AcademicFloor | null
  gpa: number | null
  group: { low: number; high: number; count: number; label: string } | null
  sat: { score: number; low: number; high: number } | null
  act: { score: number; low: number; high: number } | null
  admitRate: number | null
}): FitLine {
  const { floor, gpa, group, admitRate } = input
  const parts: string[] = []
  const marks: FitStatus[] = []

  // 1. The gate.
  if (floor?.gpa != null) {
    const kind = floor.coreCourses ? "core-course GPA" : "GPA"
    if (gpa == null) parts.push(`${floor.levelName} needs a ${floor.gpa.toFixed(1)} ${kind} to compete as a freshman. Add a GPA to check`)
    else if (gpa >= floor.gpa) {
      marks.push("fit")
      parts.push(`GPA ${gpa.toFixed(2)} clears the ${floor.gpa.toFixed(1)} ${kind} ${floor.levelName} needs to compete${floor.coreCourses ? " (the NCAA counts core courses only)" : ""}`)
    } else {
      const alt = floor.twoOfThree
      const altMet = alt && gpa >= alt.gpa && ((input.act?.score ?? 0) >= alt.act || (input.sat?.score ?? 0) >= alt.sat)
      if (altMet) {
        marks.push("fit")
        parts.push(`GPA ${gpa.toFixed(2)} is under ${floor.gpa.toFixed(1)}, but a ${alt.gpa.toFixed(1)} GPA with ${alt.act} ACT or ${alt.sat} SAT meets two of the NAIA's three`)
      } else {
        marks.push("concern")
        parts.push(
          `GPA ${gpa.toFixed(2)} is under the ${floor.gpa.toFixed(1)} ${kind} ${floor.levelName} needs to compete as a freshman` +
            (floor.shortfall ? `. ${floor.shortfall.replace(/\.$/, "")}` : "") +
            (alt ? `. The NAIA also takes two of three: ${alt.act} ACT or ${alt.sat} SAT, a ${alt.gpa.toFixed(1)} GPA, top half of the class` : ""),
        )
      }
    }
  } else if (floor?.none) {
    if (gpa != null) marks.push("fit")
    parts.push(floor.none.replace(/\.$/, ""))
  }

  // 2. The NC wrestlers who went there.
  if (gpa != null && group) {
    const below = gpa < group.low
    marks.push(below ? "stretch" : "fit")
    parts.push(
      below
        ? `GPA ${gpa.toFixed(2)} is below all ${group.count} ${group.label} who gave a GPA (lowest ${group.low.toFixed(2)})`
        : `${group.count} ${group.label} gave a GPA of ${group.low.toFixed(2)} to ${group.high.toFixed(2)}`,
    )
  }

  // 3. Published test ranges.
  const selective = admitRate != null && admitRate < HIGHLY_SELECTIVE_ADMIT_RATE
  const tests: string[] = []
  for (const [label, t] of [["SAT", input.sat], ["ACT", input.act]] as const) {
    if (!t) continue
    const where = t.score > t.high ? "above" : t.score < t.low ? "below" : "within"
    if (selective) marks.push(where === "below" ? "stretch" : "fit")
    else if (where !== "below") marks.push("fit")
    tests.push(`${label} ${t.score} is ${where} the middle half of admitted students (${t.low} to ${t.high})`)
  }
  if (selective) {
    if (!tests.length) marks.push("stretch")
    parts.push(`Highly selective: ${admitRate}% of applicants are admitted, and coaches here have less room to help in admissions`)
    parts.push(...tests)
  } else if (tests.length) {
    parts.push(...tests)
    parts.push(ALL_STUDENTS.replace(/\.$/, ""))
  }

  if (!parts.length) return { status: "unknown", text: "No test score or GPA to compare. Add them to the profile." }
  const status: FitStatus = marks.includes("concern") ? "concern" : marks.includes("stretch") ? "stretch" : marks.length ? "fit" : "unknown"
  return { status, text: `${parts.join(". ")}.` }
}

/** What aided students paid on average, against the family's budget. Family income is never asked. */
export function costFit(input: { netPrice: number | null; netNote: string; published: number | null; budget: number | null }): FitLine {
  const { netPrice, published, budget } = input
  const money = (n: number) => `$${n.toLocaleString("en-US")}`
  if (budget == null) {
    return netPrice != null
      ? { status: "unknown", text: `Aided students paid about ${money(netPrice)} a year on average, before any athletic scholarship. Add a budget to compare.` }
      : { status: "unknown", text: `${input.netNote} Add a budget to compare.` }
  }
  const figure = netPrice ?? published
  if (figure == null) return { status: "unknown", text: "No price published." }
  const basis = netPrice != null ? "aided students paid on average" : "the published price, before any aid, is"
  const gap = figure - budget
  if (gap <= 0) return { status: "fit", text: `Within your ${money(budget)} budget: ${basis} ${money(figure)}.` }
  if (gap <= Math.max(5_000, budget * 0.15)) return { status: "stretch", text: `${money(gap)} over your budget: ${basis} ${money(figure)}.` }
  return { status: "concern", text: `${money(gap)} over your budget: ${basis} ${money(figure)}.${netPrice == null ? " Aid could close some of that; ask." : ""}` }
}

const sizeOf = (undergrads: number) => (undergrads < 5_000 ? "small" : undergrads <= 15_000 ? "medium" : "large")
const settingOf = (setting: string | null) => (!setting ? null : /city/i.test(setting) ? "city" : /suburb/i.test(setting) ? "suburb" : /town/i.test(setting) ? "town" : /rural/i.test(setting) ? "rural" : null)

/** Distance, size and setting against what the family said. */
export function goalsFit(profile: FamilyFitProfile, college: { majors: string[] | null; miles: number | null; undergrads: number | null; setting: string | null }): FitLine {
  const ok: string[] = []
  const no: string[] = []
  // Majors do not count toward fit (Matt, 6 Nov 2026), even when Compare's old goals hold some.
  if (profile.maxMiles != null && college.miles != null) {
    ;(college.miles <= profile.maxMiles ? ok : no).push(`${college.miles.toLocaleString("en-US")} miles from home`)
  }
  if (profile.size && college.undergrads != null) {
    const s = sizeOf(college.undergrads)
    ;(s === profile.size ? ok : no).push(`${s} (${college.undergrads.toLocaleString("en-US")} undergraduates)`)
  }
  if (profile.settings.length && college.setting) {
    const s = settingOf(college.setting)
    ;(s && profile.settings.includes(s) ? ok : no).push(college.setting.toLowerCase())
  }
  if (!ok.length && !no.length) return { status: "unknown", text: "Tell us the distance, size and setting you want to compare." }
  const text = [ok.length ? `Fits: ${ok.join(", ")}` : null, no.length ? `Doesn't: ${no.join(", ")}` : null].filter(Boolean).join(". ") + "."
  return { status: no.length === 0 ? "fit" : ok.length === 0 ? "concern" : "stretch", text }
}

const POINTS: Record<FitStatus, number> = { fit: 2, stretch: 1, concern: 0, unknown: 0 }

/** For ordering: how well the four parts fit. Unknown parts neither help nor hurt. */
export function fitScore(lines: FitLine[]): number {
  return lines.reduce((n, l) => n + POINTS[l.status], 0)
}
