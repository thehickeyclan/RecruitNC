import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

/** National team bracket result — edit here if placement changes. */
export const NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT = "Round of 32"

/** Select team bracket result — Day 3 competition. */
export const NHSCA_DUALS_2026_SELECT_ACHIEVEMENT = "Round of 64"

export type PublicHeroStats = {
  dualRecord: string
  individual: string
  winPct: number | null
  teamPoints: number
}

export type HeroStatTile = { label: string; value: string }

export function scopeShowsNationalAchievement(scope: CommandCenterScope): boolean {
  return scope === "all" || scope === "national"
}

export function buildPublicHeroStats(
  snapshot: NhscaDualsResultsSnapshot,
  scope: CommandCenterScope
): PublicHeroStats {
  const filter = scope === "all" ? null : scope
  const n = snapshot.summaries.national
  const s = snapshot.summaries.select
  let dualW = 0
  let dualL = 0
  let matchW = 0
  let matchL = 0
  let teamPoints = 0
  if (!filter || filter === "national") {
    dualW += n.dualWins
    dualL += n.dualLosses
    matchW += n.matchWins
    matchL += n.matchLosses
    teamPoints += n.pointsFor
  }
  if (!filter || filter === "select") {
    dualW += s.dualWins
    dualL += s.dualLosses
    matchW += s.matchWins
    matchL += s.matchLosses
    teamPoints += s.pointsFor
  }
  const total = matchW + matchL

  return {
    dualRecord: `${dualW}-${dualL}`,
    individual: `${matchW}-${matchL}`,
    winPct: total > 0 ? Math.round((matchW / total) * 100) : null,
    teamPoints,
  }
}

export function buildHeroStatTiles(
  stats: PublicHeroStats,
  scope: CommandCenterScope
): HeroStatTile[] {
  let fourth: HeroStatTile
  if (scope === "all") {
    fourth = {
      label: "Bracket finish",
      value: `Nat. ${NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT.replace("Round of ", "R")} · Sel. ${NHSCA_DUALS_2026_SELECT_ACHIEVEMENT.replace("Round of ", "R")}`,
    }
  } else if (scope === "select") {
    fourth = { label: "Bracket finish", value: NHSCA_DUALS_2026_SELECT_ACHIEVEMENT }
  } else if (scopeShowsNationalAchievement(scope)) {
    fourth = { label: "Bracket finish", value: NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT }
  } else {
    fourth = { label: "Team points", value: String(stats.teamPoints) }
  }

  return [
    { label: "Dual record", value: stats.dualRecord },
    { label: "Individual bouts", value: stats.individual },
    { label: "Win %", value: stats.winPct != null ? `${stats.winPct}%` : "—" },
    fourth,
  ]
}

export function scopeTeamLabel(scope: CommandCenterScope): string {
  if (scope === "national") return "National team"
  if (scope === "select") return "Select team"
  return "National and Select teams"
}

export function scopeHeadline(scope: CommandCenterScope): string {
  if (scope === "national") {
    return `NC United National Team Advances to the ${NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}`
  }
  if (scope === "select") {
    return `NC United Select Team Advances to the ${NHSCA_DUALS_2026_SELECT_ACHIEVEMENT}`
  }
  return "NC United at NHSCA Duals 2026"
}

export function scopeSubheadline(scope: CommandCenterScope): string {
  if (scope === "national") {
    return `All-North Carolina National squad reaches the ${NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT} at Virginia Beach`
  }
  if (scope === "select") {
    return `Select squad reaches the ${NHSCA_DUALS_2026_SELECT_ACHIEVEMENT} in Day 3 competition at Virginia Beach`
  }
  return `National team reaches the ${NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT} · Select team reaches the ${NHSCA_DUALS_2026_SELECT_ACHIEVEMENT} on Day 3`
}

export function scopeAchievementLine(scope: CommandCenterScope): string | null {
  if (scope === "all") {
    return `National — ${NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT} · Select — ${NHSCA_DUALS_2026_SELECT_ACHIEVEMENT}`
  }
  if (scope === "select") {
    return `NC United Select Team — ${NHSCA_DUALS_2026_SELECT_ACHIEVEMENT}`
  }
  if (!scopeShowsNationalAchievement(scope)) return null
  return `NC United National Team — ${NHSCA_DUALS_2026_NATIONAL_ACHIEVEMENT}`
}

export function scopePhotoTitle(scope: CommandCenterScope): string {
  if (scope === "national") return "NC United — National Team"
  if (scope === "select") return "NC United — Select Team"
  return "NC United — National & Select"
}
