/**
 * Two wrestlers compared, for a coach.
 *
 * Verified college coaches and admins only (lib/compare-access.ts, Matt 7 October 2026). It was
 * open to Blue members and subscribers on the rankings' rule; it is a recruiting tool.
 *
 * North Carolina wrestlers only for now. Out-of-state results are held, but opponent strength and
 * identity links are only validated for NC; other states open up as their data is checked.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { compareAthletes } from "@/lib/athlete-comparison"
import { loadComparisonBouts } from "@/lib/athlete-comparison-load"
import { buildComparisonRows, buildComparisonSections, individualNationalEvents, type ComparisonReport } from "@/lib/athlete-comparison-rows"
import { hasPerfectRecruit } from "@/lib/program-fit"
import { loadProgramFit, resolveProgramScope } from "@/lib/program-fit-store"
import { mayUseComparison } from "@/lib/compare-access"
import { loadActivity } from "@/lib/activity-load"
import { classifyViewer } from "@/lib/viewer-role"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { buildScoutingReport, loadOpponentIndex } from "@/lib/scouting-report"
import { loadStatePlacerIndex } from "@/lib/state-placers"
import { releasesPersonalData, scoutingAccessTier } from "@/lib/scouting-report-access"

export const dynamic = "force-dynamic"

/** Best NCHSAA finish, as a place and as a coach would say it: "2nd, 2026 6A 113". */
function bestStateFinish(report: ComparisonReport): { stateBestPlace: number | null; stateBestLabel: string | null } {
  const best = report.results
    .filter((r) => r.event === "NCHSAA State Championships" && r.place != null)
    .sort((a, b) => a.place! - b.place! || b.year - a.year)[0]
  if (!best) return { stateBestPlace: null, stateBestLabel: null }
  const [cls, weight] = best.detail.split(" · ")
  const place = best.place === 1 ? "Champion" : `${best.place}${best.place === 2 ? "nd" : best.place === 3 ? "rd" : "th"}`
  return { stateBestPlace: best.place!, stateBestLabel: `${place}, ${best.year} ${[cls, weight].filter(Boolean).join(" ")}` }
}

/** A published RecruitNC rank (the top 30 only) or a national ranking, said plainly; null when neither. */
function rankedLabel(report: ComparisonReport): string | null {
  const national = [...report.nationalRankings].sort((a, b) => a.current - b.current)[0]
  if (national) return `#${national.current} ${national.sourceLabel}`
  if (report.rankingPublished && report.prospectRanking != null) {
    return `#${report.prospectRanking} RecruitNC, Class of ${report.identity.graduationYear}`
  }
  return null
}
/*
 * The out-of-state opponent index takes most of a minute to build on a cold server (it is cached
 * for ten minutes after). The scouting report pays the same cost; this must not time out first.
 */
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leftId = String(searchParams.get("left") ?? "").trim()
  const rightId = String(searchParams.get("right") ?? "").trim()
  if (!leftId || !rightId) {
    return NextResponse.json({ error: "Pick two wrestlers." }, { status: 400 })
  }
  if (leftId === rightId) {
    return NextResponse.json({ error: "Pick two different wrestlers." }, { status: 400 })
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Sign in to compare wrestlers." }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin, verified_method")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!mayUseComparison({ profile })) {
    return NextResponse.json({ error: "The comparison is for verified college coaches." }, { status: 403 })
  }
  const classified = classifyViewer(profile ?? null)
  const isAdmin = classified.kind === "admin" || profile?.is_admin === true
  const tier = scoutingAccessTier({
    isCollegeCoach: classified.isCollegeCoach,
    isAdmin,
    verifiedCoach: classified.verifiedCoach || isAdmin,
    verifiedMethod: (profile?.verified_method as string) ?? null,
  })
  const personal = releasesPersonalData(tier)

  const [leftLoaded, rightLoaded] = await Promise.all([
    loadPublicAthleteProfile(leftId, admin),
    loadPublicAthleteProfile(rightId, admin),
  ])
  if (!leftLoaded.ok || !rightLoaded.ok) {
    return NextResponse.json({ error: "Could not find one of those wrestlers." }, { status: 404 })
  }
  const leftAthlete = leftLoaded.athlete as Record<string, unknown>
  const rightAthlete = rightLoaded.athlete as Record<string, unknown>
  if (leftAthlete.is_nc_athlete !== true || rightAthlete.is_nc_athlete !== true) {
    return NextResponse.json(
      { error: "Comparisons cover North Carolina wrestlers for now. Other states open as their results are checked." },
      { status: 400 },
    )
  }

  // One opponent index for both reports - the same one the scouting report and profile use.
  const [baseIndex, stateIndex] = await Promise.all([
    loadOpponentIndex(admin),
    loadStatePlacerIndex(admin, new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    })),
  ])
  const opponentIndex = { ...baseIndex, ...stateIndex }

  const side = (athlete: Record<string, unknown>) => ({ id: String(athlete.id), name: String(athlete.name ?? "") })
  const [leftReport, rightReport, leftBouts, rightBouts] = await Promise.all([
    buildScoutingReport(admin, leftAthlete, opponentIndex, tier, null),
    buildScoutingReport(admin, rightAthlete, opponentIndex, tier, null),
    loadComparisonBouts(admin, side(leftAthlete)),
    loadComparisonBouts(admin, side(rightAthlete)),
  ])

  const onTheMat = compareAthletes(leftBouts, rightBouts)
  // Days since each last competed - the same reading as the directory and My Recruits.
  const activity = await loadActivity(admin, [leftAthlete as { id: string; graduationyear?: unknown }, rightAthlete as { id: string; graduationyear?: unknown }]).catch(
    () => new Map(),
  )

  /*
   * Program fit, for the viewers who may set it: the staff's saved needs, checked against both.
   * GPA and test scores are in it, so it rides on the same line as the rest of the personal data.
   */
  const fitSubject = (report: ComparisonReport) => ({
    graduationYear: report.identity.graduationYear,
    collegeWeightClass: report.identity.collegeWeightClass,
    currentWeight: report.identity.lastCompetedWeight ?? report.identity.weightClass,
    gpa: report.academics.gpa,
    sat: report.academics.sat,
    act: report.academics.act,
    academicInterest: report.academics.academicInterest,
    nationalEvents: individualNationalEvents(report).length,
    ...bestStateFinish(report),
    rankedLabel: rankedLabel(report),
  })
  // The page re-checks these itself as the coach edits the needs, so it gets the facts, not a verdict.
  const savedFit = personal ? await loadProgramFit(admin, await resolveProgramScope(admin, user.id)) : null
  const programFit = personal
    ? {
        saved: savedFit && hasPerfectRecruit(savedFit.criteria) ? savedFit : null,
        left: fitSubject(leftReport),
        right: fitSubject(rightReport),
      }
    : null
  return NextResponse.json({
    comparison: {
      left: { id: leftReport.athleteId, name: leftReport.identity.name, photoUrl: leftReport.identity.photoUrl, school: leftReport.identity.highSchool, graduationYear: leftReport.identity.graduationYear, weight: leftReport.identity.weightClass },
      right: { id: rightReport.athleteId, name: rightReport.identity.name, photoUrl: rightReport.identity.photoUrl, school: rightReport.identity.highSchool, graduationYear: rightReport.identity.graduationYear, weight: rightReport.identity.weightClass },
      headToHead: onTheMat.headToHead,
      commonOpponents: onTheMat.commonOpponents,
      commonOpponentEdge: onTheMat.commonOpponentEdge,
      verdict: onTheMat.verdict,
      rows: buildComparisonRows(leftReport, rightReport, {
        personal,
        activity: { left: activity.get(leftReport.athleteId) ?? null, right: activity.get(rightReport.athleteId) ?? null },
      }),
      sections: buildComparisonSections(leftReport, rightReport),
      personal,
      programFit,
    },
  })
}
