/**
 * The roadmap adapts to the wrestler (Matt, 17 Oct 2026): "as things change - grades,
 * accomplishments, requirements - so does your plan".
 *
 * The checklist in roadmap.ts is the same for every family. This takes what we know about one
 * wrestler and changes it in three ways, all mechanical, never a model's guess:
 *  - **Done from the data.** A step the data proves is ticked for the family: a video on the
 *    profile, a test score, five colleges on the list.
 *  - **Added for the wrestler.** A step that only applies to this wrestler goes to the top of his
 *    year: a GPA below a division's minimum, a state placing to send coaches, programs that viewed
 *    him and are not on the list.
 *  - **Carried forward.** An important step from an earlier year that was never done moves into
 *    this year, so a junior who never built a list is not shown a finished sophomore column.
 *
 * Each change carries a short reason ("GPA 2.1 on the profile"), shown under the step. An added
 * step is not ticked by hand; it leaves when the data changes.
 */
import type { Grade } from "@/lib/recruiting/learn/timeline"
import { ROADMAP, type RoadmapItem, type RoadmapYear } from "@/lib/recruiting/learn/roadmap"

export type RoadmapSignals = {
  firstName: string
  grade: Grade
  gpa: number | null
  sat: number | null
  act: number | null
  hasVideo: boolean
  profilePercent: number | null
  /** Colleges on the family's list, and how many have reached each stage or beyond. */
  listCount: number
  questionnaireOrBeyond: number
  contactedOrBeyond: number
  upcomingEvents: number
  /** Programs that viewed the wrestler and are not on the list. */
  viewedNotListed: number
  /** The best state finish of the latest season, if any. */
  stateFinish: { year: number; place: number } | null
  /** The best national top-eight of the latest season, if any. */
  nationalFinish: { year: number; event: string; place: number } | null
}

export type AdaptedItem = RoadmapItem & {
  /** Ticked from the data, not by the family. */
  auto?: boolean
  /** Only on this wrestler's roadmap; resolves when the data changes, not by a tick. */
  added?: boolean
  /** Why it was ticked, added or carried forward, in a few words. */
  because?: string
}
export type AdaptedYear = Omit<RoadmapYear, "items"> & { items: AdaptedItem[] }

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`
const GRADE_WORD: Record<Grade, string> = { 8: "8th grade", 9: "9th grade", 10: "10th grade", 11: "11th grade", 12: "12th grade" }

/** At most this many steps join a year, so the column stays a checklist and not a pile. */
const MOST_ADDED = 4

/** Steps worth carrying into a later year when they were never done, most important first. */
const CARRY = ["g10-list", "g10-video", "g10-questionnaires", "g10-email", "g8-ec", "g9-explore"]

/** What the data proves is done, with the reason. */
function autoDone(s: RoadmapSignals): Map<string, string> {
  const done = new Map<string, string>()
  done.set("g8-profile", "Profile claimed")
  if (s.profilePercent != null && s.profilePercent >= 90) done.set("g9-profile", `Profile ${s.profilePercent}% complete`)
  if (s.hasVideo) {
    done.set("g9-video", "Video on the profile")
    done.set("g10-video", "Video on the profile")
  }
  if (s.upcomingEvents > 0) done.set("g9-schedule", `${s.upcomingEvents} event${s.upcomingEvents === 1 ? "" : "s"} on the schedule`)
  if (s.listCount >= 1) done.set("g9-explore", `${s.listCount} on the list`)
  if (s.listCount >= 5) done.set("g10-list", `${s.listCount} colleges on the list`)
  if (s.questionnaireOrBeyond >= 1) done.set("g10-questionnaires", `${s.questionnaireOrBeyond} questionnaire${s.questionnaireOrBeyond === 1 ? "" : "s"} done`)
  if (s.contactedOrBeyond >= 1) done.set("g10-email", `${s.contactedOrBeyond} college${s.contactedOrBeyond === 1 ? "" : "s"} contacted`)
  if (s.sat || s.act) done.set("g11-tests", s.sat ? `SAT ${s.sat} on the profile` : `ACT ${s.act} on the profile`)
  return done
}

/** Steps only this wrestler has, most urgent first. */
function addedFor(s: RoadmapSignals): AdaptedItem[] {
  const out: AdaptedItem[] = []
  const add = (id: string, text: string, because: string, href?: string) => out.push({ id: `a-${id}`, text, because, href, added: true })

  // Grades: the division minimums are in the rules library (2.3 Division I, 2.2 Division II core-course GPA).
  if (s.gpa == null) add("gpa-missing", "Add the GPA to the profile", "Coaches check it first", "/my-recruiting")
  else if (s.gpa < 2.2) add("gpa-d2", "Raise the core GPA to 2.2 or better", `GPA ${s.gpa.toFixed(2)}; Division II needs 2.2`, "/recruiting/learn/eligibility-center")
  else if (s.gpa < 2.3) add("gpa-d1", "Raise the core GPA to 2.3 or better", `GPA ${s.gpa.toFixed(2)}; Division I needs 2.3`, "/recruiting/learn/eligibility-center")

  // Accomplishments: a result coaches should hear about from the family, not find by chance.
  if (s.grade >= 9) {
    const national = s.nationalFinish
    const state = s.stateFinish
    if (national) add("send-national", "Email coaches the All-American finish", `${ordinal(national.place)} at ${national.event} ${national.year}`, "/my-recruiting/colleges")
    else if (state?.place === 1) add("send-state", "Email coaches the state title", `${state.year} state champion`, "/my-recruiting/colleges")
    else if (state) add("send-state", "Email coaches the state placing", `${ordinal(state.place)} at ${state.year} states`, "/my-recruiting/colleges")
  }

  // Interest: programs already looking, and not yet on the list.
  if (s.viewedNotListed > 0) {
    const n = s.viewedNotListed
    add("viewed", `Look at the ${n} program${n === 1 ? "" : "s"} that viewed ${s.firstName}`, "Not on your list yet", "/my-recruiting/activity")
  }

  // Requirements: a senior with no test score is short of time.
  if (s.grade === 12 && !s.sat && !s.act) add("test-senior", "Take the SAT or ACT this fall", "No score on the profile", "/recruiting/learn/eligibility-center")
  return out
}

/** A good student's step: worth doing, never ahead of anything urgent. */
function academicAid(s: RoadmapSignals): AdaptedItem[] {
  if (s.gpa == null || s.gpa < 3.5 || s.grade < 10) return []
  return [{ id: "a-gpa-aid", text: "Ask admissions about academic scholarships", because: `A ${s.gpa.toFixed(2)} GPA can earn academic aid`, href: "/recruiting/learn/paying-for-college", added: true }]
}

/** The roadmap for one wrestler. `done` is what the family ticked by hand. */
export function adaptRoadmap(s: RoadmapSignals, done: string[]): { years: AdaptedYear[]; done: string[]; changes: number } {
  const auto = autoDone(s)
  const ticked = new Set(done)
  for (const id of auto.keys()) ticked.add(id)

  const byId = new Map(ROADMAP.flatMap((y) => y.items.map((i) => [i.id, { item: i, grade: y.grade }] as const)))
  // Most urgent first: the wrestler's own steps, then what was missed, then academic money.
  const own = addedFor(s).slice(0, MOST_ADDED)
  const carried = CARRY.map((id) => byId.get(id)!)
    .filter((c) => c.grade < s.grade && !ticked.has(c.item.id))
    .slice(0, Math.min(2, MOST_ADDED - own.length))
  const carriedIds = new Set(carried.map((c) => c.item.id))
  const aid = academicAid(s).slice(0, Math.max(0, MOST_ADDED - own.length - carried.length))
  const added = [...own, ...aid]
  const years: AdaptedYear[] = ROADMAP.map((year) => {
    const base: AdaptedItem[] = year.items
      // A carried step lives in this year now, not twice.
      .filter((i) => !carriedIds.has(i.id))
      .map((i) => (auto.has(i.id) ? { ...i, auto: true, because: auto.get(i.id) } : i))
    if (year.grade !== s.grade) return { ...year, items: base }
    const forward: AdaptedItem[] = carried.map((c) => ({ ...c.item, because: `Carried from ${GRADE_WORD[c.grade]}` }))
    return { ...year, items: [...own, ...forward, ...aid, ...base] }
  })
  const autoShown = years.flatMap((y) => y.items).filter((i) => i.auto).length
  return { years, done: [...ticked], changes: added.length + carried.length + autoShown }
}

/** A college's name reduced for matching a viewer's school name against a list entry. */
export function collegeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/\b(the|university|college|of|at)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
