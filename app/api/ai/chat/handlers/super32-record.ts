import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleSuper32Record: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const wrestlerName = params.wrestler || params.name
  const year = params.year

  if (!wrestlerName) {
    throw new Error("Wrestler name is required for Super32 record query")
  }

  // Query Super32 results for the wrestler
  let query = adminClient
    .from("super32_results")
    .select("athlete_name, year, weight_class, wins, losses, record, placement, high_school, school")
    .or(`athlete_name.ilike.%${wrestlerName}%,athlete_name.ilike.%${wrestlerName.toLowerCase()}%,athlete_name.ilike.%${wrestlerName.toUpperCase()}%`)

  if (year) {
    query = query.eq("year", year)
  }

  const { data: super32Data, error: super32Error } = await query
    .order("year", { ascending: false })
    .order("weight_class", { ascending: true })
    .limit(100)

  if (super32Error) {
    console.error("[Handler] super32_record error:", super32Error)
    throw super32Error
  }

  // Format results
  const results = (super32Data || []).map((record: any) => ({
    athlete_name: record.athlete_name,
    year: record.year,
    weight_class: record.weight_class,
    weight: record.weight_class,
    wins: record.wins,
    losses: record.losses,
    record: record.record,
    placement: record.placement,
    is_all_american: record.placement !== null && record.placement >= 1 && record.placement <= 8,
    high_school: record.high_school || record.school,
    source: "super32",
  }))

  console.log(`[Handler] super32_record: Found ${results.length} Super32 records for ${wrestlerName}${year ? ` in ${year}` : ""}`)

  return {
    results,
  }
}
