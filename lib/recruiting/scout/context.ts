import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { COLLEGE_LIST_STATUS_LABEL, isCollegeListStatus } from "@/lib/college-programs/list"
import data from "@/lib/college-programs/programs-2026-27.json"
import { DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { collegeFitFor, loadFamilyFitContext } from "@/lib/recruiting/college-fit"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { LOOK_POINTS } from "@/lib/recruiting/learn/coaches-look-for"
import { D1_CONTACT, D1_TRACK_LABEL, LEARN_PAGES, d1TrackFor, type LearnSection } from "@/lib/recruiting/learn/content"
import { GRADE_NAME, allDatedRules, gradeForClass, type Grade } from "@/lib/recruiting/learn/timeline"
import { adaptRoadmap } from "@/lib/recruiting/roadmap-adapt"
import { loadRoadmapSignals } from "@/lib/recruiting/roadmap-signals"
import { resolveRuleDate } from "@/lib/recruiting/scout/dates"

/**
 * Everything Scout knows when a family asks a question (17 Oct 2026). Built fresh for each
 * question from the same code the Command Center's pages use, so Scout can never disagree with
 * them: the adapted roadmap, the college list with its fit and cost, the programs that viewed the
 * wrestler, the colleges that took wrestlers with the same results, and the rules library.
 *
 * Every number and date is worked out here, never by the model (mechanical rules belong in code).
 * The model only chooses which facts answer the question and says them plainly.
 */

const SCHOOLS = new Map((data.schools as CollegeMapSchool[]).map((s) => [s.id, s]))
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()
const TIER_LABEL: Record<string, string> = {
  "state-champion": "state champion",
  "state-placer": "state placer",
  "state-qualifier": "state qualifier",
  none: "no state placing on record",
}
const standingText = (m: { tier: string; national: boolean }) => `${TIER_LABEL[m.tier] ?? m.tier}${m.national ? ", national placer" : ""}`
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export type ScoutLink = { label: string; href: string; kind: "rule" | "timeline" | "college" | "tool" }

export type ScoutContext = {
  /** The wrestler's first name, for the greeting; null when the family has no wrestler in school. */
  firstName: string | null
  classYear: number | null
  /** The facts block handed to the model. */
  facts: string
  /** The only links Scout may offer, by key. */
  links: Record<string, ScoutLink>
}

/** The library as plain text, the family's Division I contact dates in place of all three sets. */
function libraryText(track: keyof typeof D1_CONTACT): string {
  const section = (s: LearnSection) =>
    [
      `### ${s.heading}`,
      s.intro,
      ...(s.rows ?? []).map((r) => `- ${r.label}: ${r.value}`),
      ...(s.bullets ?? []).map((b) => `- ${b}`),
      s.reading ? `(Our reading, confirm with the college: ${s.reading})` : null,
      s.advice ? `Our advice (not a rule): ${s.advice}` : null,
      s.rule ? `Rule: ${s.rule}` : null,
    ]
      .filter(Boolean)
      .join("\n")
  const contact = `## Division I contact dates for ${D1_TRACK_LABEL[track]} [link: learn:division-1]\n${section(D1_CONTACT[track])}`
  const pages = LEARN_PAGES.map((p) => `## ${p.title} [link: learn:${p.slug}]\n${p.summary}\n${p.sections.map(section).join("\n")}`)
  return [contact, ...pages].join("\n\n")
}

const BASE_LINKS: Record<string, ScoutLink> = {
  timeline: { label: "See the roadmap for your class", href: "/recruiting/learn/timeline", kind: "timeline" },
  map: { label: "Open the college map", href: "/recruiting/college-map", kind: "tool" },
  list: { label: "Your college list", href: "/my-recruiting/colleges", kind: "tool" },
  compare: { label: "Compare colleges", href: "/recruiting/compare", kind: "tool" },
  activity: { label: "Who viewed the profile", href: "/my-recruiting/activity", kind: "tool" },
  inbox: { label: "Coach messages", href: "/inbox", kind: "tool" },
  plan: { label: "Your schedule", href: "/my-recruiting/plan", kind: "tool" },
  profile: { label: "Update the profile", href: "/my-recruiting", kind: "tool" },
  tournaments: { label: "Events coaches watch", href: "/recruiting/learn/tournaments", kind: "rule" },
  templates: { label: "Email templates", href: "/recruiting/learn/working-the-process", kind: "tool" },
}

/** The Division I opening dates for each class still in school, boys and girls, as calendar dates. */
function otherClasses(now: Date): string {
  const senior = seniorClassYear(now)
  const lines: string[] = []
  for (let c = senior; c <= senior + 4; c++) {
    for (const gender of ["male", "female"] as const) {
      const track = d1TrackFor(gender, c)
      const rows = (D1_CONTACT[track].rows ?? []).filter((r) => /call|materials|official/i.test(r.label))
      const parts = rows.map((r) => {
        const at = resolveRuleDate(r.value, c, now)
        return `${r.label}: ${r.value}${at ? ` = ${at.label}` : ""}`
      })
      lines.push(`- Class of ${c}, ${gender === "male" ? "boys" : "girls"}: ${parts.join("; ")}`)
    }
  }
  return lines.join("\n")
}

export async function buildScoutContext(admin: SupabaseClient, userId: string): Promise<ScoutContext> {
  const links: Record<string, ScoutLink> = { ...BASE_LINKS }
  for (const p of LEARN_PAGES) links[`learn:${p.slug}`] = { label: `View the ${p.title} rules`, href: `/recruiting/learn/${p.slug}`, kind: "rule" }

  const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
  const { data: rows } = ids.length ? await admin.from("athletes").select('id, "firstName", name, gender, graduationyear, highschool').in("id", ids) : { data: [] }
  const graduated = mostRecentGraduatedClassYear()
  const wrestler = (rows ?? [])
    .filter((a) => a.graduationyear && Number(a.graduationyear) > graduated)
    .sort((a, b) => Number(a.graduationyear) - Number(b.graduationyear))[0]

  const now = new Date()
  const today = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })
  if (!wrestler) {
    return {
      firstName: null,
      classYear: null,
      links,
      facts: `Today is ${today}.\nNo wrestler in school is linked to this account, so you know nothing about the family's wrestler. Ask for the class year when a date depends on it.\n\n# Rules library\n${libraryText("men-2028")}`,
    }
  }

  const firstName = String(wrestler.firstName ?? "").trim() || String(wrestler.name ?? "").trim().split(" ")[0] || "Your wrestler"
  const classYear = Number(wrestler.graduationyear)
  const grade = gradeForClass(classYear, seniorClassYear()) as Grade | null
  const track = d1TrackFor(wrestler.gender as string | null, classYear)
  const female = /^f/i.test(String(wrestler.gender ?? ""))
  const pronoun = wrestler.gender ? (female ? "she/her" : "he/him") : null
  const focus = await familyFocus(admin, userId).catch(() => null)
  const team = focus?.gender ?? (wrestler.gender ? (female ? "womens" : "mens") : null)

  const [signals, fitCtx, views, list] = await Promise.all([
    grade ? loadRoadmapSignals(admin, { athleteId: String(wrestler.id), userId, grade }).catch(() => null) : Promise.resolve(null),
    loadFamilyFitContext(admin, userId, team).catch(() => null),
    getCoachViewsForAthlete(admin, String(wrestler.id)).catch(() => null),
    admin.from("college_list_items").select("school_id, status").eq("user_id", userId).then((r) => r.data ?? []),
  ])
  const { data: account } = await admin.auth.admin.getUserById(userId)
  const ticked = Array.isArray(account?.user?.user_metadata?.roadmap_done) ? (account!.user!.user_metadata!.roadmap_done as string[]) : []

  const out: string[] = []
  out.push(`Today is ${today}.`)
  out.push(
    `# The wrestler\n${firstName}${pronoun ? ` (${pronoun})` : ""}, Class of ${classYear}${grade ? `, in ${GRADE_NAME[grade]} this school year` : ""}${wrestler.highschool && wrestler.highschool !== "Not specified" ? `, ${wrestler.highschool}` : ""}. ${team === "womens" ? "Women's" : team === "mens" ? "Men's" : "Unknown"} wrestling. Division I dates that apply: ${D1_TRACK_LABEL[track]}.`,
  )
  if (signals) {
    out.push(
      [
        `GPA on the profile: ${signals.gpa ?? "not entered"}. SAT: ${signals.sat ?? "none"}. ACT: ${signals.act ?? "none"}. Highlight video: ${signals.hasVideo ? "yes" : "no"}. Profile ${signals.profilePercent ?? "?"}% complete.`,
        `Latest-season results: ${signals.stateFinish ? `${signals.stateFinish.place === 1 ? "state champion" : `placed ${signals.stateFinish.place} at states`} (${signals.stateFinish.year})` : "no state placing on file"}${signals.nationalFinish ? `; placed ${signals.nationalFinish.place} at ${signals.nationalFinish.event} ${signals.nationalFinish.year}` : ""}.`,
        fitCtx?.mine
          ? `Career standing: ${standingText(fitCtx.mine)}.`
          : null,
        fitCtx?.weight ? `Last competed at ${fitCtx.weight} lbs.` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
  }

  // The contact and visit dates, as calendar dates for this class.
  const dated = allDatedRules(track).map((r) => {
    const at = resolveRuleDate(r.when, classYear, now)
    return `- ${r.level}: ${r.what}: ${r.when}${at ? ` = ${at.label} for the Class of ${classYear} (${at.open ? "already open" : "not yet"})` : ""}`
  })
  out.push(`# When colleges may contact and host ${firstName} (computed; quote these dates exactly)\n${dated.join("\n")}`)
  out.push(`# Division I first contact for every class in school (computed; for questions about another class)\n${otherClasses(now)}`)

  if (signals && grade) {
    const adapted = adaptRoadmap(signals, ticked)
    const year = adapted.years.find((y) => y.grade === grade)
    const open = (year?.items ?? []).filter((i) => !adapted.done.includes(i.id))
    out.push(
      `# ${firstName}'s roadmap for ${GRADE_NAME[grade]} (still to do, most urgent first) [link: timeline]\n${open.map((i) => `- ${i.text}${i.because ? ` (${i.because})` : ""}`).join("\n") || "- Everything for this year is done."}`,
    )
  }

  // The college list, with the same fit and cost the college pages show.
  const listLines: string[] = []
  for (const row of list) {
    const school = SCHOOLS.get(String(row.school_id))
    if (!school) continue
    links[`school:${school.id}`] = { label: spoken(school.name), href: `/recruiting/schools/${school.id}`, kind: "college" }
    const division = school.programs[0] ? DIVISION_SHORT[school.programs[0].division] : ""
    const stage = isCollegeListStatus(row.status) ? COLLEGE_LIST_STATUS_LABEL[row.status] : "Interested"
    const fit = fitCtx ? collegeFitFor(fitCtx, school, null) : null
    listLines.push(
      `- ${spoken(school.name)} (${division}, ${school.city}, ${school.state}) [link: school:${school.id}]: stage ${stage}.` +
        (fit?.cost ? ` Full yearly cost ${money(fit.cost.amount)} (${fit.cost.year}).` : "") +
        (fit?.net?.amount != null ? ` Average net price ${money(fit.net.amount)}.` : "") +
        (fit ? ` Athletic: ${fit.lines.athletic.text} Academic: ${fit.lines.academic.text}` : ""),
    )
  }
  out.push(`# The family's college list [link: list]\n${listLines.join("\n") || "- No colleges on the list yet."}`)

  // Programs that viewed the profile (the Command Center includes the names).
  const viewed = (views?.schools ?? []).slice(0, 15)
  out.push(
    `# College programs that viewed ${firstName}'s profile [link: activity]\n${viewed.map((v) => `- ${v.school}: ${v.views} view${v.views === 1 ? "" : "s"}, last ${v.lastViewedAt.slice(0, 10)}`).join("\n") || "- None yet."}`,
  )

  // Where wrestlers from this state with the same standing went: our own records, not a guess.
  if (fitCtx?.mine && fitCtx.snapshot) {
    const same = fitCtx.snapshot.commits.filter((c) => c.standing.tier === fitCtx.mine!.tier && c.standing.national === fitCtx.mine!.national && (!team || !c.gender || c.gender === team))
    const byDivision = new Map<string, number>()
    const bySchool = new Map<string, number>()
    for (const c of same) {
      byDivision.set(DIVISION_SHORT[c.division], (byDivision.get(DIVISION_SHORT[c.division]) ?? 0) + 1)
      bySchool.set(c.schoolId, (bySchool.get(c.schoolId) ?? 0) + 1)
    }
    const top = [...bySchool.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    for (const [id] of top) {
      const s = SCHOOLS.get(id)
      if (s) links[`school:${id}`] = { label: spoken(s.name), href: `/recruiting/schools/${id}`, kind: "college" }
    }
    out.push(
      `# Where wrestlers with ${firstName}'s standing went (our commitment records: ${same.length} committed wrestlers whose standing was also "${standingText(fitCtx.mine)}") [link: map]\n` +
        `By level: ${[...byDivision.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`).join(", ") || "none on file"}.\n` +
        top.map(([id, n]) => `- ${SCHOOLS.get(id) ? spoken(SCHOOLS.get(id)!.name) : id}: ${n} [link: school:${id}]`).join("\n"),
    )
  }

  out.push(`# What college coaches look at (our advice from working with college coaches)\n${LOOK_POINTS.map((p) => `- ${p.title}: ${p.text}`).join("\n")}`)
  out.push(`# Rules library (verified, with sources)\n${libraryText(track)}`)

  return { firstName, classYear, links, facts: out.join("\n\n") }
}
