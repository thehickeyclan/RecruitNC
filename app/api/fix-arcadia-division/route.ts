import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function upsertSimpleMappingIfPresent(supabase: ReturnType<typeof createClient>) {
  try {
    const { error } = await supabase.from("college_divisions").upsert(
      [
        { college_name: "Arcadia", division: "Division III", updated_at: new Date().toISOString() },
        { college_name: "Arcadia University", division: "Division III", updated_at: new Date().toISOString() },
      ],
      { onConflict: "college_name" },
    )
    if (error) {
      // Ignore missing-table errors so this route works even if the simple mapping table isn't set up yet.
      if (error.code !== "42P01") {
        throw error
      }
    }
    return true
  } catch (err) {
    // Best-effort only for the simple table
    console.warn("Simple mapping upsert skipped:", err)
    return false
  }
}

async function upsertPrimaryMapping(supabase: ReturnType<typeof createClient>) {
  // Primary mapping table used elsewhere in the app
  const { data, error } = await supabase
    .from("college_division_mappings")
    .upsert(
      [
        { college_name: "Arcadia", division: "Division III", updated_at: new Date().toISOString() },
        { college_name: "Arcadia University", division: "Division III", updated_at: new Date().toISOString() },
      ],
      { onConflict: "college_name" },
    )
    .select()
  if (error) throw error
  return data
}

async function updateAthletes(supabase: ReturnType<typeof createClient>) {
  // Update any athlete whose college contains "arcadia" (case-insensitive)
  const { data, error } = await supabase
    .from("athletes")
    .update({ division: "Division III", updated_at: new Date().toISOString() })
    .ilike("college", "%arcadia%")
    .select("id")
  if (error) throw error
  return data?.length || 0
}

export async function GET() {
  try {
    const supabase = createClient()
    const primary = await upsertPrimaryMapping(supabase)
    await upsertSimpleMappingIfPresent(supabase)
    const updatedCount = await updateAthletes(supabase)

    return NextResponse.json({
      success: true,
      message: 'Arcadia set to "Division III" and athletes updated.',
      mappingRowsAffected: primary?.length ?? 0,
      athleteCount: updatedCount,
    })
  } catch (error: any) {
    console.error("fix-arcadia-division error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // POST behaves the same as GET for convenience
  return GET()
}
