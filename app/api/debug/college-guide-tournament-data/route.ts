/**
 * Debug: Verify Super32/NHSCA lookup for College Recruiting Guide.
 * Hit GET /api/debug/college-guide-tournament-data?names=Zack Knott,Ammon Scott
 * Run locally (npm run dev) to verify BEFORE deploying.
 */
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const namesParam = request.nextUrl.searchParams.get("names") || "Zack Knott,Ammon Scott"
  const names = namesParam.split(",").map((n) => n.trim()).filter(Boolean)
  const gradYear = 2026

  const db = createAdminClient()
  const results: Record<string, { super32: any[]; nhsca: any[] }> = {}

  for (const name of names) {
    const [super32, nhsca] = await Promise.all([
      getSuper32FromTable(db, name, gradYear),
      getNHSCAFromTables(db, name, gradYear),
    ])
    results[name] = { super32, nhsca }
  }

  // Raw DB check: what rows exist for these names?
  const rawSuper32Knott = await db.from("super32_results").select("year, athlete_name, record, high_school").or("athlete_name.ilike.%Zack%,athlete_name.ilike.%Zach%,athlete_name.ilike.%Knott%").gte("year", 2022).lte("year", 2026)
  const rawSuper32Scott = await db.from("super32_results").select("year, athlete_name, record, high_school").or("athlete_name.ilike.%Ammon%,athlete_name.ilike.%Amon%,athlete_name.ilike.%Scott%").gte("year", 2022).lte("year", 2026)
  const rawNhscaKnott = await db.from("wrestling_nhsca_results").select("year, athlete_name, record").or("athlete_name.ilike.%Zack%,athlete_name.ilike.%Zach%,athlete_name.ilike.%Knott%").gte("year", 2022).lte("year", 2026)
  const rawNhscaScott = await db.from("wrestling_nhsca_results").select("year, athlete_name, record").or("athlete_name.ilike.%Ammon%,athlete_name.ilike.%Amon%,athlete_name.ilike.%Scott%").gte("year", 2022).lte("year", 2026)

  return NextResponse.json({
    message: "Run locally to verify before deploy. Check rawDb — if empty, data is not in this Supabase.",
    gradYear,
    results,
    rawDb: {
      super32_knott: { data: rawSuper32Knott.data, error: rawSuper32Knott.error?.message },
      super32_scott: { data: rawSuper32Scott.data, error: rawSuper32Scott.error?.message },
      nhsca_knott: { data: rawNhscaKnott.data, error: rawNhscaKnott.error?.message },
      nhsca_scott: { data: rawNhscaScott.data, error: rawNhscaScott.error?.message },
    },
  })
}
