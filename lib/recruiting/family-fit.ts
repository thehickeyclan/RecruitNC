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
 * - Academic: test scores against the middle half of admitted students; GPA against the NC
 *   wrestlers who went there, where five or more reported one.
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

/** Test scores against the middle half; GPA against the NC wrestlers who went there. */
export function academicFit(input: {
  sat: { score: number; low: number; high: number } | null
  act: { score: number; low: number; high: number } | null
  gpa: { mine: number; average: number; count: number; label: string } | null
  admitRate: number | null
}): FitLine {
  const parts: string[] = []
  const marks: FitStatus[] = []
  for (const [name, t] of [["SAT", input.sat], ["ACT", input.act]] as const) {
    if (!t) continue
    const where = t.score > t.high ? "above" : t.score < t.low ? "below" : "within"
    marks.push(where === "below" ? "stretch" : "fit")
    parts.push(`${name} ${t.score} is ${where} the middle half (${t.low} to ${t.high})`)
  }
  if (input.gpa) {
    const g = input.gpa
    marks.push(g.mine >= g.average - 0.1 ? "fit" : "stretch")
    parts.push(`GPA ${g.mine.toFixed(2)} against an average of ${g.average.toFixed(2)} for ${g.label} (${g.count}, as reported)`)
  }
  if (input.admitRate != null && input.admitRate < 20) {
    marks.push("stretch")
    parts.push(`only ${input.admitRate}% of applicants are admitted`)
  }
  if (!parts.length) return { status: "unknown", text: "No test score or GPA to compare. Add them to the profile." }
  const status: FitStatus = marks.includes("stretch") ? "stretch" : "fit"
  return { status, text: `${parts.join("; ")}.` }
}

/** What families at their income paid, against their budget. */
export function costFit(input: { netPrice: number | null; netNote: string; published: number | null; budget: number | null }): FitLine {
  const { netPrice, published, budget } = input
  const money = (n: number) => `$${n.toLocaleString("en-US")}`
  if (budget == null) {
    return netPrice != null
      ? { status: "unknown", text: `Families at your income paid about ${money(netPrice)} a year. Add a budget to compare.` }
      : { status: "unknown", text: `${input.netNote} Add a budget to compare.` }
  }
  const figure = netPrice ?? published
  if (figure == null) return { status: "unknown", text: "No price published." }
  const basis = netPrice != null ? "families at your income paid" : "the published price, before any aid, is"
  const gap = figure - budget
  if (gap <= 0) return { status: "fit", text: `Within your ${money(budget)} budget: ${basis} ${money(figure)}.` }
  if (gap <= Math.max(5_000, budget * 0.15)) return { status: "stretch", text: `${money(gap)} over your budget: ${basis} ${money(figure)}.` }
  return { status: "concern", text: `${money(gap)} over your budget: ${basis} ${money(figure)}.${netPrice == null ? " Aid could close some of that; ask." : ""}` }
}

const sizeOf = (undergrads: number) => (undergrads < 5_000 ? "small" : undergrads <= 15_000 ? "medium" : "large")
const settingOf = (setting: string | null) => (!setting ? null : /city/i.test(setting) ? "city" : /suburb/i.test(setting) ? "suburb" : /town/i.test(setting) ? "town" : /rural/i.test(setting) ? "rural" : null)

/** Major, distance, size and setting against what the family said. */
export function goalsFit(profile: FamilyFitProfile, college: { majors: string[] | null; miles: number | null; undergrads: number | null; setting: string | null }): FitLine {
  const ok: string[] = []
  const no: string[] = []
  if (profile.majors.length) {
    if (!college.majors) no.push("majors not published")
    else {
      const has = profile.majors.filter((m) => college.majors!.includes(m))
      const missing = profile.majors.filter((m) => !college.majors!.includes(m))
      if (has.length) ok.push(`offers ${has.map((m) => LABEL.get(m)!.toLowerCase()).join(" and ")}`)
      if (missing.length) no.push(`no ${missing.map((m) => LABEL.get(m)!.toLowerCase()).join(" or ")} degree`)
    }
  }
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
  if (!ok.length && !no.length) return { status: "unknown", text: "Tell us your intended major, distance, size and setting to compare." }
  const text = [ok.length ? `Fits: ${ok.join(", ")}` : null, no.length ? `Doesn't: ${no.join(", ")}` : null].filter(Boolean).join(". ") + "."
  return { status: no.length === 0 ? "fit" : ok.length === 0 ? "concern" : "stretch", text }
}

const POINTS: Record<FitStatus, number> = { fit: 2, stretch: 1, concern: 0, unknown: 0 }

/** For ordering: how well the four parts fit. Unknown parts neither help nor hurt. */
export function fitScore(lines: FitLine[]): number {
  return lines.reduce((n, l) => n + POINTS[l.status], 0)
}
