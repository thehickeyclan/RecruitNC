import type { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { scoutingReportAvailable } from "@/lib/scouting-report-access"
import { loadActivity } from "@/lib/activity-load"
import type { ActivityStatus } from "@/lib/activity-status"

export type MyRecruitRow = {
  athleteId: string
  name: string
  photoUrl: string | null
  classYear: number | null
  /** Last competed weight (lib/prospect-last-competed.ts); the listed weight only as a fallback. */
  weight: string | null
  highSchool: string | null
  club: string | null
  /** Published class rank, shown only to a viewer allowed to see rankings. */
  rank: number | null
  /** "NCHSAA 7A State 2nd '26" - the best state finish on file. */
  stateFinish: string | null
  /** "NHSCA 4th '25 · Super 32 3rd '24" - national placings (top 8). */
  nationalFinish: string | null
  committedTo: string | null
  starredAt: string
  /** Whoever on the staff starred him; "You" for the viewer. */
  starredBy: string
  /** Only the viewer's own stars can be removed from here. */
  mine: boolean
  /** Whether a scouting report exists for this wrestler — the profile button's rule, so a coach never clicks into "unavailable". */
  hasReport: boolean
  /** Days since the last result on file, and a flag when the gap means something (lib/activity-status.ts). */
  activity: ActivityStatus | null
}

const ordinal = (n: number) => (n === 1 ? "Champion" : `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`)
const yy = (y: number) => `’${String(y).slice(-2)}`

/**
 * My Recruits: every wrestler the coach - or anyone on their school's staff - has starred with
 * "Add to Watch List", as one flat list with the facts a coach scans for. Works for a coach with no
 * school attached (the old page told them "Access Unavailable").
 */
/** The board for one coach - split out so it can be checked against a real account. */
export async function loadMyRecruits(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const user = { id: userId }
  const { data: me } = await admin.from("user_profiles").select("school_id, role, is_admin").eq("user_id", user.id).maybeSingle()

  // The whole staff's board when the coach has a school; their own stars otherwise.
  let staff: Array<{ user_id: string; full_name: string | null }> = [{ user_id: user.id, full_name: "You" }]
  if (me?.school_id) {
    const { data } = await admin.from("user_profiles").select("user_id, full_name").eq("school_id", me.school_id)
    if (data?.length) staff = data as typeof staff
  }
  const staffName = new Map(staff.map((s) => [s.user_id, s.user_id === user.id ? "You" : (s.full_name ?? "Staff")]))

  const { data: stars, error } = await admin
    .from("college_coach_stars")
    .select("athlete_id, coach_user_id, starred_at")
    .in("coach_user_id", staff.map((s) => s.user_id))
    .order("starred_at", { ascending: false })
  if (error) throw new Error(error.message)

  // One row per wrestler: the earliest star wins the "starred by", the viewer's own star wins "mine".
  const byAthlete = new Map<string, { starredAt: string; starredBy: string; mine: boolean }>()
  for (const s of stars ?? []) {
    const cur = byAthlete.get(s.athlete_id)
    const mine = s.coach_user_id === user.id
    if (!cur) byAthlete.set(s.athlete_id, { starredAt: s.starred_at, starredBy: staffName.get(s.coach_user_id) ?? "Staff", mine })
    else if (mine) cur.mine = true
  }
  const ids = [...byAthlete.keys()]
  if (!ids.length) return { recruits: [] as MyRecruitRow[], hasSchool: Boolean(me?.school_id), schoolId: (me?.school_id as string | null) ?? null }

  /*
   * Results reach a profile two ways: the row's own athlete_id, and result_athlete_links (what the
   * profile reads - lib/identity). Both, so a finish linked only through the matcher still shows.
   */
  type Res = { id: string; athlete_id: string | null; year: number; place?: number | null; placement?: number | null; classification?: string | null }
  const linked = async (table: string, columns: string): Promise<Res[]> => {
    const { data: direct } = await admin.from(table).select(`id, athlete_id, ${columns}`).in("athlete_id", ids)
    const { data: links } = await admin
      .from("result_athlete_links")
      .select("source_id, athlete_id")
      .eq("source_table", table)
      .eq("status", "linked")
      .in("athlete_id", ids)
    const owner = new Map((links ?? []).map((l) => [l.source_id as string, l.athlete_id as string]))
    const directIds = new Set(((direct ?? []) as unknown as Res[]).map((d) => d.id))
    const extraIds = [...owner.keys()].filter((sid) => !directIds.has(sid))
    const { data: extra } = extraIds.length
      ? await admin.from(table).select(`id, athlete_id, ${columns}`).in("id", extraIds)
      : { data: [] }
    return [
      ...((direct ?? []) as unknown as Res[]),
      ...((extra ?? []) as unknown as Res[]).map((r) => ({ ...r, athlete_id: owner.get(r.id) ?? r.athlete_id })),
    ]
  }
  const [{ data: athletes }, state, nhsca, s32, { viewer }] = await Promise.all([
    admin.from("athletes").select("id, name, wrestling_name, photourl, gender, graduationyear, weightclass, highschool, wrestlingClub, college, recruiting_status, prospect_ranking").in("id", ids),
    linked("wrestling_nchsaa_results", "year, place, classification"),
    linked("nhsca_placements", "year, placement"),
    linked("super32_results", "year, placement"),
    resolveRankingViewerForUser({ admin, userId: user.id }),
  ])
  const seeRank = canSeeProspectRanking(viewer)
  // Who has gone quiet - an injury, a missed season - on the board a staff scans every day.
  const activity = await loadActivity(admin as never, (athletes ?? []) as Array<{ id: string; graduationyear?: unknown }>).catch(
    () => new Map<string, ActivityStatus>(),
  )

  const recruits: MyRecruitRow[] = []
  for (const id of ids) {
    const a = (athletes ?? []).find((x) => x.id === id)
    if (!a) continue
    const star = byAthlete.get(id)!
    const best = state
      .filter((r) => r.athlete_id === id && Number(r.place) > 0)
      .sort((x, y) => Number(x.place) - Number(y.place) || Number(y.year) - Number(x.year))[0]
    const national = [
      ...nhsca.filter((r) => r.athlete_id === id).map((r) => ({ ev: "NHSCA", year: Number(r.year), place: Number(r.placement) })),
      ...s32.filter((r) => r.athlete_id === id).map((r) => ({ ev: "Super 32", year: Number(r.year), place: Number(r.placement) })),
    ]
      .filter((r) => r.place >= 1 && r.place <= 8)
      .sort((x, y) => x.place - y.place || y.year - x.year)
      .slice(0, 2)
      .map((r) => `${r.ev} ${ordinal(r.place)} ${yy(r.year)}`)
    const classYear = a.graduationyear ? Number(a.graduationyear) : null
    const rank =
      seeRank && a.prospect_ranking && isPublicRankingsYearPublished(classYear) && Number(a.prospect_ranking) <= getPublicRankingsMax(classYear)
        ? Number(a.prospect_ranking)
        : null
    const college = (a.college ?? "").trim()
    recruits.push({
      athleteId: id,
      name: (a.wrestling_name || a.name || "").trim(),
      photoUrl: a.photourl ?? null,
      classYear,
      // The weight he last competed at; the listed one only when nothing is on file.
      weight: activity.get(id)?.lastWeight ?? (a.weightclass ? String(a.weightclass) : null),
      highSchool: a.highschool ?? null,
      club: a.wrestlingClub ?? null,
      rank,
      stateFinish: best ? `NCHSAA ${best.classification ?? ""} State ${ordinal(Number(best.place))} ${yy(Number(best.year))}`.replace(/\s+/g, " ") : null,
      nationalFinish: national.length ? national.join(" · ") : null,
      committedTo: college && college !== "Not specified" ? college : null,
      starredAt: star.starredAt,
      starredBy: star.starredBy,
      mine: star.mine,
      hasReport: scoutingReportAvailable(a),
      activity: activity.get(id) ?? null,
    })
  }
  return { recruits, hasSchool: Boolean(me?.school_id), schoolId: (me?.school_id as string | null) ?? null }
}
