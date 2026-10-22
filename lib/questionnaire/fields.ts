/**
 * The questions a college recruiting questionnaire asks, in one list (Matt, 22 Oct 2026: "almost
 * all of them are same questionnaire - fill it in, have the family review and submit").
 *
 * Mapped from the real forms on the three platforms most of our 135 linked colleges use: ARMS (59
 * links), SIDEARM (26) and Front Rush (20). SIDEARM and Front Rush label every field in plain words
 * ("Parent/Guardian #1 Phone Number", "NCAA Eligibility Center ID Number"), so `match` is a set of
 * label patterns and the same list drives the copy page and, later, the autofill helper.
 *
 * Two kinds of answer:
 * - `profile`: already on the wrestler's profile (name, school, GPA, weight...). Shown filled in;
 *   the family can change it here for forms without touching the profile.
 * - `family`: only the family knows it (date of birth, address, parents, coaches, NCAA ID). Typed
 *   once, kept private: staff and the family read it, coaches and the public never do.
 *
 * Left out on purpose: parents' occupations and anything about family income (never asked, see
 * the family-income rule), and marketing opt-ins (NCSA, IMG) - the helper always answers those
 * "No thanks", and the family is never asked.
 */

export type AnswerSource = "profile" | "family"

export type AnswerGroup = "wrestler" | "home" | "parents" | "school" | "wrestling" | "coaches"

export const ANSWER_GROUPS: Array<{ key: AnswerGroup; label: string }> = [
  { key: "wrestler", label: "Wrestler" },
  { key: "home", label: "Home address" },
  { key: "parents", label: "Parents" },
  { key: "school", label: "School and academics" },
  { key: "wrestling", label: "Wrestling" },
  { key: "coaches", label: "Coaches" },
]

export type AnswerField = {
  key: string
  label: string
  group: AnswerGroup
  source: AnswerSource
  /** Input kind on our form. */
  input?: "text" | "date" | "email" | "tel" | "url"
  /** A short hint under the box. */
  hint?: string
  /** Most forms require it: counted in "ready" and flagged when blank. */
  core?: boolean
  /** Label patterns a form field must match (lower-cased, whitespace folded). */
  match: RegExp[]
}

export const ANSWER_FIELDS: AnswerField[] = [
  { key: "firstName", label: "First name", group: "wrestler", source: "profile", core: true, match: [/^(legal )?first( name)?\b/, /^first$/] },
  { key: "middleName", label: "Middle name", group: "wrestler", source: "family", match: [/^middle( name| initial)?/] },
  { key: "lastName", label: "Last name", group: "wrestler", source: "profile", core: true, match: [/^(legal )?last( name)?\b/, /^last$/] },
  { key: "preferredName", label: "Preferred name", group: "wrestler", source: "family", hint: "Only if he or she goes by another name", match: [/preferred name|nickname/] },
  { key: "dob", label: "Date of birth", group: "wrestler", source: "family", input: "date", core: true, match: [/date of birth|birth ?date|^dob\b/] },
  { key: "email", label: "Wrestler's email", group: "wrestler", source: "profile", input: "email", core: true, match: [/^(e-?mail|email address|your e-?mail)$/, /^(athlete|student|recruit)('s)? e-?mail/] },
  { key: "cell", label: "Wrestler's cell", group: "wrestler", source: "profile", input: "tel", core: true, match: [/^(cell|mobile)( phone)?( number| #)?$/, /^(athlete|student)('s)? (cell|phone)/, /^contact number$/] },

  { key: "street", label: "Street address", group: "home", source: "family", core: true, match: [/^(home )?(street )?address ?(1|line 1)?$/, /^street address$/] },
  { key: "city", label: "City", group: "home", source: "family", core: true, match: [/^(home )?city$/] },
  { key: "state", label: "State", group: "home", source: "family", core: true, match: [/^(home )?state$/] },
  { key: "zip", label: "ZIP code", group: "home", source: "family", core: true, match: [/^(home )?(zip|postal)( code)?$/] },

  { key: "parent1Name", label: "Parent 1 name", group: "parents", source: "family", core: true, match: [/parent.*(1|one|#1).*name|^(mother|father|parent|guardian)('s)? name$/] },
  { key: "parent1Relation", label: "Parent 1 relationship", group: "parents", source: "family", hint: "Mother, Father, Guardian", match: [/^relationship$/] },
  { key: "parent1Phone", label: "Parent 1 phone", group: "parents", source: "family", input: "tel", core: true, match: [/parent.*(1|one|#1).*(phone|cell)/] },
  { key: "parent1Email", label: "Parent 1 email", group: "parents", source: "family", input: "email", core: true, match: [/parent.*(1|one|#1).*e-?mail/] },
  { key: "parent2Name", label: "Parent 2 name", group: "parents", source: "family", match: [/parent.*(2|two|#2).*name/] },
  { key: "parent2Phone", label: "Parent 2 phone", group: "parents", source: "family", input: "tel", match: [/parent.*(2|two|#2).*(phone|cell)/] },
  { key: "parent2Email", label: "Parent 2 email", group: "parents", source: "family", input: "email", match: [/parent.*(2|two|#2).*e-?mail/] },

  { key: "highSchool", label: "High school", group: "school", source: "profile", core: true, match: [/^(high school|school name|high school information|current school)$/] },
  { key: "gradYear", label: "Graduation year", group: "school", source: "profile", core: true, match: [/grad(uation)? year|class of|hs graduation/] },
  { key: "gpa", label: "GPA", group: "school", source: "profile", core: true, hint: "As on the transcript, e.g. 3.8 unweighted", match: [/\bgpa\b/] },
  { key: "sat", label: "SAT total", group: "school", source: "profile", match: [/^sat( total| score)?$/] },
  { key: "act", label: "ACT", group: "school", source: "profile", match: [/^act( composite| score)?$/] },
  { key: "classRank", label: "Class rank", group: "school", source: "family", hint: "e.g. 24 of 410, if the school ranks", match: [/class rank/] },
  { key: "major", label: "Intended major", group: "school", source: "profile", match: [/^(?!graduate).*(major|academic interest|field of study)/] },
  { key: "academicHonors", label: "Academic honors", group: "school", source: "family", match: [/academic honou?rs|academic awards/] },
  { key: "ncaaId", label: "NCAA Eligibility Center ID", group: "school", source: "family", hint: "10 digits, from the NCAA Eligibility Center", match: [/ncaa.*(id|number)|eligibility center/] },

  { key: "heightFt", label: "Height (feet)", group: "wrestling", source: "family", core: true, match: [/^feet$/] },
  { key: "heightIn", label: "Height (inches)", group: "wrestling", source: "family", core: true, match: [/^inch(es)?$/] },
  { key: "weight", label: "Weight", group: "wrestling", source: "profile", core: true, hint: "Filled from where he or she last competed", match: [/^(current )?weight( class)?$/] },
  { key: "club", label: "Club", group: "wrestling", source: "profile", match: [/^(name of )?club( team)?$/] },
  { key: "record", label: "Career record", group: "wrestling", source: "profile", match: [/career record|^record$/] },
  { key: "accolades", label: "Results and honors", group: "wrestling", source: "profile", match: [/accomplishment|accolade|athletic honou?rs|awards/] },
  { key: "video", label: "Highlight video", group: "wrestling", source: "profile", input: "url", match: [/video|highlight|film/] },
  { key: "profileUrl", label: "Recruiting profile", group: "wrestling", source: "profile", input: "url", match: [/recruiting (website|profile)|profile link|website/] },

  { key: "hsCoachName", label: "High school coach", group: "coaches", source: "family", core: true, match: [/high school coach('s)?( name)?$/, /^hs coach( name)?$/] },
  { key: "hsCoachPhone", label: "High school coach phone", group: "coaches", source: "family", input: "tel", match: [/high school coach.*phone/] },
  { key: "hsCoachEmail", label: "High school coach email", group: "coaches", source: "family", input: "email", match: [/high school coach.*e-?mail/] },
  { key: "clubCoachName", label: "Club coach", group: "coaches", source: "family", match: [/club (team )?coach('s)?( name)?$/] },
  { key: "clubCoachPhone", label: "Club coach phone", group: "coaches", source: "family", input: "tel", match: [/club (team )?coach.*phone/] },
  { key: "clubCoachEmail", label: "Club coach email", group: "coaches", source: "family", input: "email", match: [/club (team )?coach.*e-?mail/] },
]

const FIELD_BY_KEY = new Map(ANSWER_FIELDS.map((f) => [f.key, f]))

export type Answers = Partial<Record<string, string>>

/** Lower-case, fold whitespace and punctuation runs, drop a trailing required star. */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\*/g, " ")
    .replace(/[:?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** The answer a form field with this label wants, or null. First match in list order wins. */
export function fieldForLabel(label: string): AnswerField | null {
  const l = normalizeLabel(label)
  if (!l) return null
  for (const f of ANSWER_FIELDS) if (f.match.some((re) => re.test(l))) return f
  return null
}

/**
 * Clean what the family typed: trimmed, capped, and in the shape the box asks for. A value that
 * fails its shape is dropped rather than stored wrong (a date of birth must be a real date).
 */
export function cleanAnswers(input: unknown): Answers {
  const out: Answers = {}
  if (!input || typeof input !== "object") return out
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = FIELD_BY_KEY.get(key)
    if (!field || typeof raw !== "string") continue
    const v = raw.replace(/\s+/g, " ").trim().slice(0, field.key === "accolades" || field.key === "academicHonors" ? 1000 : 200)
    if (!v) continue
    if (field.input === "date") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
      const year = m ? Number(m[1]) : 0
      if (!m || year < 1990 || year > new Date().getFullYear() || Number.isNaN(Date.parse(v))) continue
    }
    if (field.input === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) continue
    if (field.input === "url" && !/^https?:\/\//i.test(v)) continue
    out[key] = v
  }
  return out
}

/** "31 of 36 ready" counts the core answers that have a value. */
export function readiness(values: Answers): { ready: number; total: number; missing: AnswerField[] } {
  const core = ANSWER_FIELDS.filter((f) => f.core)
  const missing = core.filter((f) => !values[f.key])
  return { ready: core.length - missing.length, total: core.length, missing }
}
