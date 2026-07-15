/**
 * Query Handler Registry
 * 
 * This registry maps query types to their handler functions.
 * Each handler is isolated and cannot break other handlers.
 * 
 * To add a new query type:
 * 1. Create a handler function in the appropriate file
 * 2. Import it here
 * 3. Add it to the registry
 */

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"

// Handler function type
export type QueryHandler = (
  params: any,
  request: NextRequest,
  messageId: string | null
) => Promise<{
  results?: any[]
  aggregateResult?: any
  directResponse?: NextResponse
}>

// Handler registry
const handlers: Record<string, QueryHandler> = {}

// Register a handler
export function registerHandler(queryType: string, handler: QueryHandler) {
  handlers[queryType] = handler
}

// Get a handler
export function getHandler(queryType: string): QueryHandler | null {
  return handlers[queryType] || null
}

// Check if a handler exists
export function hasHandler(queryType: string): boolean {
  return queryType in handlers
}

// Get all registered query types (for debugging)
export function getRegisteredTypes(): string[] {
  return Object.keys(handlers)
}

// Import and register all handlers
import { handleNhscaAllAmericanCount } from "./nhsca-all-american-count"
import { handleNhscaSchoolLeaderboard } from "./nhsca-school-leaderboard"
import { handleNhscaAllAmerican } from "./nhsca-all-american"
import { handleNhscaPlacerRecords } from "./nhsca-placer-records"
import { handleNhscaPlacerCount } from "./nhsca-placer-count"
import { handleNhscaNationalChampion } from "./nhsca-national-champion"
import { handleNhscaChampionCount } from "./nhsca-champion-count"
import { handleStateChampionRecords } from "./state-champion-records"
import { handleStateChampionCount } from "./state-champion-count"
import { handleStatePlacerRecords } from "./state-placer-records"
import { handleStatePlacerCount } from "./state-placer-count"
import { handleStateSchoolStats } from "./state-school-stats"
import { handleNhscaSchoolYears } from "./nhsca-school-years"
import { handleCalendar } from "./calendar"
import { handleDualTeamChampionships } from "./dual-team-championships"
import { handleDivisionRegion } from "./division-region"
import { handleSuper32AllAmerican } from "./super32-all-american"
import { handleSuper32AllAmericanCount } from "./super32-all-american-count"
import { handleSuper32Record } from "./super32-record"
import { handleSuper32SchoolLeaderboard } from "./super32-school-leaderboard"
import { handleCombinedAllAmerican } from "./combined-all-american"
import { handleRivalry } from "./rivalry"
import { handleProspectRankings } from "./prospect-rankings"
import { handleSuper32WinningRecords } from "./super32-winning-records"
import { handleWinningestWrestler } from "./winningest-wrestler"

// Register critical handlers first
registerHandler("nhsca_all_american_count", handleNhscaAllAmericanCount)
registerHandler("nhsca_school_leaderboard", handleNhscaSchoolLeaderboard)
registerHandler("nhsca_all_american", handleNhscaAllAmerican)
registerHandler("nhsca_placer_records", handleNhscaPlacerRecords)
registerHandler("nhsca_placer_count", handleNhscaPlacerCount)
registerHandler("nhsca_national_champion", handleNhscaNationalChampion)
registerHandler("nhsca_champion_count", handleNhscaChampionCount)
registerHandler("state_champion_records", handleStateChampionRecords)
registerHandler("state_champion_count", handleStateChampionCount)
registerHandler("state_placer_records", handleStatePlacerRecords)
registerHandler("state_placer_count", handleStatePlacerCount)
registerHandler("state_school_stats", handleStateSchoolStats)
registerHandler("nhsca_school_years", handleNhscaSchoolYears)
registerHandler("calendar", handleCalendar)
registerHandler("dual_team", handleDualTeamChampionships)
registerHandler("division_region", handleDivisionRegion)

// Super32 handlers
registerHandler("super32_all_american", handleSuper32AllAmerican)
registerHandler("super32_all_american_count", handleSuper32AllAmericanCount)
registerHandler("super32_record", handleSuper32Record)
registerHandler("super32_school_leaderboard", handleSuper32SchoolLeaderboard)
registerHandler("combined_all_american", handleCombinedAllAmerican)
registerHandler("unc_ncstate_rivalry", handleRivalry)
registerHandler("prospect_rankings", handleProspectRankings)
registerHandler("super32_winning_records", handleSuper32WinningRecords)
registerHandler("winningest_wrestler", handleWinningestWrestler)

// TODO: Migrate remaining handlers to plugin system
// For now, they will fall through to legacy switch statement

export { handlers }

