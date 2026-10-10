/**
 * Coach Home: everything a college coach uses, on one page.
 *
 * A coach had to know the site to use it - rankings under one menu, profiles under another, the
 * comparison under a third, My Recruits and messages somewhere else again - and most never found
 * past the page they landed on (Matt, 10 October 2026). Nothing here is new: it is the search, the
 * coach's own board and inbox, and a door to each tool, in the order a coach reaches for them.
 *
 * Verified college coaches and admins, on the comparison's rule (lib/compare-access.ts) without
 * its tester list - testers were given the comparison, not the rest of a coach's account.
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { classifyViewer } from "@/lib/viewer-role"
import { loadCoachRoster } from "@/lib/coach-roster"
import { loadMyRecruits } from "@/lib/my-recruits"
import { isApprovedCoach, listThreads } from "@/lib/coach-messages"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { resolveEntityLogoUrl } from "@/lib/entity-logo-resolve"
import { PUBLIC_TOP_75_COLLEGE_RELEASED, PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"
import CoachHomeClient, { type CoachHomeData } from "./coach-home-client"

export const dynamic = "force-dynamic"

export const metadata = { title: "Coach Home | RecruitNC" }

export default async function CoachHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <CoachHomeClient access="signed-out" data={null} />

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, verification_status, is_admin, full_name, first_name, school_id")
    .eq("user_id", user.id)
    .maybeSingle()
  const classified = classifyViewer(profile ?? null)
  const isAdmin = classified.kind === "admin" || profile?.is_admin === true
  if (!isAdmin && !(classified.isCollegeCoach && classified.verifiedCoach)) {
    return <CoachHomeClient access="not-coach" data={null} />
  }

  // Each part fails on its own: a slow inbox must not take the search and the links down with it.
  const [board, threads, roster, school] = await Promise.all([
    loadMyRecruits(admin, user.id).catch(() => null),
    listThreads(admin, user.id).catch(() => null),
    loadCoachRoster().catch(() => []),
    profile?.school_id
      ? admin
          .from("schools")
          .select("name, logo_url")
          .eq("id", profile.school_id)
          .maybeSingle()
          .then((r) => ({ name: (r.data?.name as string | null) ?? null, logo: (r.data?.logo_url as string | null) ?? null }), () => null)
      : Promise.resolve(null),
  ])

  /*
   * The program's own logo, then the site's college logo for that name. Only 18 of the 53 schools
   * coaches belong to carry one of their own, and the commitments pages already hold most of the
   * rest. Nothing found means no logo, never a placeholder crest.
   */
  const programLogo =
    school?.logo || (school?.name ? await resolveEntityLogoUrl("college", school.name).catch(() => null) : null) || null

  // The board's five against the program's perfect recruit; an extra, so a failure shows nothing.
  const recruitIds = (board?.recruits ?? []).slice(0, 5).map((r) => r.athleteId)
  const fitFlags = await resolveFitViewer(admin, user.id)
    .then((v) => (v.allowed && v.hasStandard ? loadFitFlags(admin, recruitIds, v.saved!.criteria, { personal: v.personal }) : null))
    .catch(() => null)

  const coachThreads = (threads ?? []).filter((t) => t.viewerRole === "coach")
  const recruits = board?.recruits ?? []
  const data: CoachHomeData = {
    // "Coach Hickey", the way a coach is addressed; the full name's last word.
    coachName: String(profile?.full_name ?? "").trim().split(/\s+/).slice(-1)[0] || String(profile?.first_name ?? "").trim() || null,
    isAdmin,
    program: school?.name ?? null,
    programLogo,
    schoolId: (profile?.school_id as string | null) ?? null,
    athletes: roster as CoachHomeData["athletes"],
    recruits: {
      loaded: board != null,
      total: recruits.length,
      latest: recruits.slice(0, 5).map((r) => ({
        id: r.athleteId,
        name: r.name,
        classYear: r.classYear,
        weight: r.weight,
        highSchool: r.highSchool,
        lastCompeted: r.activity?.label ?? null,
        fit: fitFlags?.get(r.athleteId) ? { verdict: fitFlags.get(r.athleteId)!.verdict, summary: fitFlags.get(r.athleteId)!.summary } : null,
      })),
      // Who has been on the mat lately: the reason to look at the board again.
      competedRecently: recruits
        .filter((r) => r.activity?.daysAgo != null && r.activity.daysAgo <= 30)
        .sort((a, b) => a.activity!.daysAgo! - b.activity!.daysAgo!)
        .slice(0, 5)
        .map((r) => ({ id: r.athleteId, name: r.name, label: r.activity!.label, event: r.activity!.lastEvent })),
    },
    messages: {
      loaded: threads != null,
      // The reviewed-coach test messaging itself applies; admins read, they do not write.
      canStart: isApprovedCoach(profile ?? null),
      unread: coachThreads.filter((t) => t.unread).length,
      latest: coachThreads.slice(0, 3).map((t) => ({
        id: t.id,
        athleteName: t.athleteName,
        preview: t.lastMessagePreview,
        unread: t.unread,
        yourTurn: t.yourTurn,
      })),
    },
    rankingYears: [...PUBLISHED_PUBLIC_RANKINGS_YEARS],
    top75: PUBLIC_TOP_75_COLLEGE_RELEASED,
  }
  return <CoachHomeClient access="ok" data={data} />
}
