import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/debug/jackson-dettore-2026-nchsaa
 *
 * Returns all 2026 NCHSAA results where wrestler_name contains "Jackson".
 * Identify the D'Ettore row (or misspelling) manually, then add that exact spelling to
 * SAME_PERSON_NAME_ALIASES (lib/nchsaa-results.ts) or fix the DB.
 *
 * SQL: SELECT wrestler_name, year, classification, weight_class, place, school
 *      FROM wrestling_nchsaa_results WHERE year = 2026 AND wrestler_name ILIKE '%Jackson%' ORDER BY wrestler_name, classification, weight_class;
 */
export async function GET() {
  const db = createAdminClient()
  const { data, error } = await db
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, year, classification, weight_class, place, school")
    .eq("year", 2026)
    .ilike("wrestler_name", "%Jackson%")
    .order("wrestler_name")
    .order("classification")
    .order("weight_class")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}
