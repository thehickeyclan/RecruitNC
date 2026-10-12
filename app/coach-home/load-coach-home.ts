import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"
import { loadCoachRoster } from "@/lib/coach-roster"
import { loadMyRecruits } from "@/lib/my-recruits"
import { isApprovedCoach, listThreads } from "@/lib/coach-messages"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { programLogo as resolveProgramLogo } from "@/lib/coach-program-logo"
import { PUBLIC_TOP_75_COLLEGE_RELEASED, PUBLISHED_PUBLIC_RANKINGS_YEARS, getPublicRankingsMax } from "@/lib/public-rankings-cap"
import { currentClassYears } from "@/lib/class-years"
import type { CoachHomeData } from "./coach-home-client"


/**
 * Everything Coach Home shows one coach, by user id.
 *
 * Apart from the page so the same load can be run for any coach without their session: the local
 * preview (app/dev/coach-preview) renders exactly what a named coach sees, which is how a wrong
 * logo on a head coach's first screen gets caught before he does.
 */
export async function loadCoachHome(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ access: "not-coach"; data: null } | { access: "ok"; data: CoachHomeData }> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, verification_status, is_admin, full_name, first_name, school_id")
    .eq("user_id", userId)
    .maybeSingle()
  const classified = classifyViewer(profile ?? null)
  const isAdmin = classified.kind === "admin" || profile?.is_admin === true
  if (!isAdmin && !(classified.isCollegeCoach && classified.verifiedCoach)) {
    return { access: "not-coach", data: null }
  }

  // Each part fails on its own: a slow inbox must not take the search and the links down with it.
  const [board, threads, roster, school] = await Promise.all([
    loadMyRecruits(admin, userId).catch(() => null),
    listThreads(admin, userId).catch(() => null),
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
  // One function decides this, shared with the staff check at /admin/coach-logos, so that page shows what a coach sees.
  const programLogo = (await resolveProgramLogo({ name: school?.name ?? null, logo_url: school?.logo ?? null })).url

  // The board's five against the program's perfect recruit; an extra, so a failure shows nothing.
  const recruitIds = (board?.recruits ?? []).slice(0, 5).map((r) => r.athleteId)
  const fitFlags = await resolveFitViewer(admin, userId)
    .then((v) => (v.allowed && v.hasStandard ? loadFitFlags(admin, recruitIds, v.saved!.criteria, { personal: v.personal }) : null))
    .catch(() => null)

  const coachThreads = (threads ?? []).filter((t) => t.viewerRole === "coach")
  const recruits = board?.recruits ?? []

  /*
   * Somebody to act on, on the page a coach lands on: the highest-ranked wrestlers in the two
   * oldest published classes who have not committed and are not on this board yet. Nine coaches
   * signed up on 11 October 2026, eight reached this page, and none starred anyone - the first
   * wrestler was four clicks away. Never allowed to fail the page.
   */
  const onBoard = new Set(recruits.map((r) => r.athleteId))
  const lastWeight = new Map((roster as Array<{ id: string; weightclass: string | null }>).map((a) => [a.id, a.weightclass]))
  const suggestYears = currentClassYears().filter((y) => PUBLISHED_PUBLIC_RANKINGS_YEARS.includes(y)).slice(0, 2)
  const suggested = suggestYears.length
    ? await admin
        .from("athletes")
        .select("id, name, graduationyear, highschool, prospect_ranking, college, recruiting_status")
        .eq("is_nc_athlete", true)
        .in("graduationyear", suggestYears)
        .gte("prospect_ranking", 1)
        .order("prospect_ranking", { ascending: true })
        .limit(120)
        .then(
          (r) => {
            const open = (r.data ?? []).filter((a) => {
              const year = Number(a.graduationyear)
              const college = String(a.college ?? "").trim()
              const status = String(a.recruiting_status ?? "").trim().toLowerCase()
              return (
                Number(a.prospect_ranking) <= getPublicRankingsMax(year) &&
                (!college || college === "Not specified") &&
                status !== "committed" &&
                status !== "signed" &&
                !onBoard.has(String(a.id))
              )
            })
            // Four from each class, seniors first: the ones a coach is deciding on now.
            return suggestYears.flatMap((year) =>
              open
                .filter((a) => Number(a.graduationyear) === year)
                .slice(0, 4)
                .map((a) => ({
                  id: String(a.id),
                  name: String(a.name ?? ""),
                  classYear: year,
                  rank: Number(a.prospect_ranking),
                  weight: lastWeight.get(String(a.id)) ?? null,
                  highSchool: (a.highschool as string | null) ?? null,
                })),
            )
          },
          () => [],
        )
    : []
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
    suggested,
    rankingYears: [...PUBLISHED_PUBLIC_RANKINGS_YEARS],
    top75: PUBLIC_TOP_75_COLLEGE_RELEASED,
  }
  return { access: "ok", data }
}
