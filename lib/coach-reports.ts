import "server-only"
import fs from "node:fs"
import path from "node:path"
import type { SupabaseClient } from "@supabase/supabase-js"
import { classifyViewer } from "@/lib/viewer-role"
import { programLogo as resolveProgramLogo } from "@/lib/coach-program-logo"
import { coachProgramOf, viewGenderFor } from "@/lib/recruiting/coach-program"
import type { AthleteEventReport } from "@/lib/coach-event-report"
import { liveStates } from "@/lib/recruiting/brand"

/**
 * College coaches' tournament reports (Matt, 26 Oct 2026): one full report per event, every NC
 * wrestler in it, built off NC United's recap of the event. A coach's staff stars mark their
 * wrestlers; the page filters to them and prints to PDF. Grades never appear (Matt: no grades in
 * coach reports), even though the recap behind it has them.
 *
 * The data file is built once by scripts/coach-event-report.ts --all-entrants --json-out and read
 * here on the server only: it holds notable losses, which are coach-only.
 */
export type CoachReportDef = {
  slug: string
  title: string
  eventKey: string
  date: string
  file: string
  /** Men's and women's are separate reports (Matt, 26 Oct 2026). */
  gender: "Male" | "Female"
  /** NC United's recap of the event, when there is one: its write-ups and order feed the report. */
  recapSlug: string | null
  /** The state the report covers. NC United lists North Carolina's; RecruitWrestlers every live state's. */
  state: string
  /**
   * The state's entrants (seeds, bouts, bracket), when they are not in the event's published live
   * snapshot, which holds North Carolina's: e.g. content/reports/super32-2026-sc.json.
   */
  entrantsFile?: string
}

export const COACH_REPORTS: CoachReportDef[] = [
  {
    slug: "super32-2026-mens",
    title: "Super 32 2026 — North Carolina Men's Report",
    eventKey: "super32-2026",
    date: "2026-10-25",
    file: "content/reports/super32-2026.json",
    gender: "Male",
    recapSlug: "super32-2026-nc-boys-recap",
    state: "NC",
  },
  {
    slug: "super32-2026-womens",
    title: "Super 32 2026 — North Carolina Women's Report",
    eventKey: "super32-2026",
    date: "2026-10-25",
    file: "content/reports/super32-2026.json",
    gender: "Female",
    recapSlug: "super32-2026-nc-girls-recap",
    state: "NC",
  },
  {
    // The 34 South Carolina boys with a profile (content/reports/super32-2026-sc.json; 21 more have none).
    slug: "super32-2026-sc-mens",
    title: "Super 32 2026 — South Carolina Men's Report",
    eventKey: "super32-2026",
    date: "2026-10-25",
    file: "content/reports/super32-2026-sc-coach.json",
    gender: "Male",
    recapSlug: "super32-2026-sc-boys-recap",
    state: "SC",
    entrantsFile: "content/reports/super32-2026-sc.json",
  },
]

/** A report file's own entrants (seeds, bouts, bracket), by athlete id; empty when the live snapshot holds them. */
export function loadReportEntrants<E extends { athleteId?: string | null }>(def: CoachReportDef): Map<string, E> {
  if (!def.entrantsFile) return new Map()
  const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), def.entrantsFile), "utf8")) as { entrants: E[] }
  return new Map(file.entrants.filter((e) => e.athleteId).map((e) => [String(e.athleteId), e]))
}

/**
 * Men's or women's report: the bracket a wrestler entered decides, then the profile. The Sheppard
 * twins (Conway, SC) wrestled the boys' 113 bracket at Super 32 2026 and belong in the men's report.
 */
export function reportGender(profileGender: string | null | undefined, bracket: string | null | undefined): "Male" | "Female" {
  if (bracket === "boys") return "Male"
  if (bracket === "girls") return "Female"
  return /^f/i.test(profileGender ?? "") ? "Female" : "Male"
}

/** The reports an address carries: North Carolina's on NC United, every live state's on RecruitWrestlers. */
export function reportsOnAddress(onRecruitWrestlers: boolean): CoachReportDef[] {
  const states = new Set<string>(liveStates(onRecruitWrestlers).map((s) => s.code))
  return COACH_REPORTS.filter((d) => states.has(d.state))
}

export type CoachReportFile = {
  event: { key: string; name: string; date: string }
  generatedAt: string
  reports: AthleteEventReport[]
  summaries: Record<string, string>
  photos: Record<string, string>
}

const cache = new Map<string, CoachReportFile>()
export function loadCoachReportFile(def: CoachReportDef): CoachReportFile {
  const hit = cache.get(def.file)
  if (hit) return hit
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), def.file), "utf8")) as CoachReportFile
  cache.set(def.file, data)
  return data
}

export type CoachReportViewer =
  | { access: "signed-out" | "not-coach" }
  | {
      access: "ok"
      userId: string
      isAdmin: boolean
      program: string | null
      programLogo: string | null
      /** Men's, women's or both (null): which report the Reports folder lists first. */
      viewGender: "Male" | "Female" | null
      /**
       * The reports this coach may open (Matt, 26 Oct 2026): a men's program sees the men's report
       * only, a women's program the women's only, "both" and admins see both. No program on file
       * reads as men's, as everywhere else on the coach site (viewGenderFor).
       */
      genders: Array<"Male" | "Female">
      /** Athletes starred by anyone on this coach's staff (same school), or by the coach alone without one. */
      starred: Set<string>
      /** Starred by this coach himself: his to remove from the report. */
      mine: Set<string>
      /** An admin looking as another coach: stars are shown, never changed. */
      readOnly: boolean
    }

/**
 * Verified college coaches and admins, on Coach Home's rule. An admin may pass a coach's user id
 * (`as`) to see exactly that coach's report: their program, logo and staff stars.
 */
export async function resolveCoachReportViewer(admin: SupabaseClient, userId: string | null, asUserId?: string | null): Promise<CoachReportViewer> {
  if (!userId) return { access: "signed-out" }
  const cols = "user_id, role, profile_type, verified_coach, verification_status, is_admin, school_id, institution"
  const { data: me } = await admin.from("user_profiles").select(cols).eq("user_id", userId).maybeSingle()
  const meClass = classifyViewer(me ?? null)
  const isAdmin = meClass.kind === "admin" || me?.is_admin === true
  if (!isAdmin && !(meClass.isCollegeCoach && meClass.verifiedCoach)) return { access: "not-coach" }

  let subject = me
  if (isAdmin && asUserId) {
    const { data: other } = await admin.from("user_profiles").select(cols).eq("user_id", asUserId).maybeSingle()
    if (other) subject = other
  }
  const subjectId = String(subject?.user_id ?? userId)

  // The staff: every coach at the same school. A coach without a school is his own staff.
  let staff = [subjectId]
  if (subject?.school_id) {
    const { data: mates } = await admin.from("user_profiles").select("user_id").eq("school_id", subject.school_id)
    staff = [...new Set([subjectId, ...(mates ?? []).map((m) => String(m.user_id))])]
  }
  const { data: stars } = await admin.from("college_coach_stars").select("athlete_id, coach_user_id").in("coach_user_id", staff)

  let program = (subject?.institution as string | null) ?? null
  let logoUrl: string | null = null
  if (subject?.school_id) {
    const { data: school } = await admin.from("schools").select("name, logo_url").eq("id", subject.school_id).maybeSingle()
    program = (school?.name as string | null) ?? program
    logoUrl = (school?.logo_url as string | null) ?? null
  }
  const programLogo = program ? (await resolveProgramLogo({ name: program, logo_url: logoUrl })).url : null

  const coachProgram = await admin.auth.admin.getUserById(subjectId).then((r) => coachProgramOf(r.data?.user), () => null)
  // A "both" program sees men's and women's with men's first; otherwise its own leads.
  const vg = coachProgram === "both" ? null : viewGenderFor(coachProgram, null)

  return {
    access: "ok",
    userId: subjectId,
    isAdmin,
    program,
    programLogo,
    viewGender: vg,
    genders: isAdmin && !asUserId ? ["Male", "Female"] : coachProgram === "both" ? ["Male", "Female"] : [vg ?? "Male"],
    starred: new Set((stars ?? []).map((s) => String(s.athlete_id))),
    mine: new Set((stars ?? []).filter((s) => String(s.coach_user_id) === subjectId).map((s) => String(s.athlete_id))),
    readOnly: subjectId !== userId,
  }
}

/**
 * A recap write-up with any sentence about grades taken out: coach reports carry no grades.
 * ("He never beat a seed himself, which keeps him out of the A group, but ..." loses that sentence.)
 */
export function withoutGradeTalk(paragraph: string): string {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [paragraph]
  return sentences.filter((s) => !/\b(grade[ds]?|A group|B group|A-|B\+|honorable mention)\b/i.test(s)).join("").trim()
}
