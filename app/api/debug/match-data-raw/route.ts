import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get list of all tables
    const { data: tablesData, error: tablesError } = await supabase
      .rpc("get_table_names")
      .then((result) => result)
      .catch(() => ({ data: [], error: null }))

    // Get matches table structure
    const { data: columnsData, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "matches")
      .then((result) => result)
      .catch(() => ({ data: [], error: null }))

    // Get total count of matches
    const { count: totalCount, error: countError } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })

    // Get sample records
    const { data: sampleRecords, error: sampleError } = await supabase.from("matches").select("*").limit(3)

    // Get Anna's data specifically
    const { data: annaData, error: annaError } = await supabase
      .from("matches")
      .select("*")
      .ilike("first_name", "%anna%")

    // Get Liam's data specifically
    const { data: liamData, error: liamError } = await supabase
      .from("matches")
      .select("*")
      .ilike("first_name", "%liam%")

    console.log("Database debug info:", {
      totalCount,
      sampleRecordsCount: sampleRecords?.length,
      annaRecordsCount: annaData?.length,
      liamRecordsCount: liamData?.length,
    })

    return NextResponse.json({
      tables: tablesData?.map((t: any) => t.table_name || t.name) || ["matches", "athletes", "logo_mappings"],
      matches_columns: columnsData?.map((c: any) => c.column_name) || [
        "id",
        "wrestler_id",
        "first_name",
        "last_name",
        "season",
        "grade",
        "high_school",
        "total_matches",
        "wins",
        "losses",
        "pins",
        "tech_falls",
        "decisions",
        "major_decisions",
        "forfeits_won",
        "matches",
        "created_at",
      ],
      sample_records: sampleRecords || [],
      total_count: totalCount || 0,
      anna_data: annaData || [],
      liam_data: liamData || [],
      errors: {
        tables: tablesError?.message,
        columns: columnsError?.message,
        count: countError?.message,
        sample: sampleError?.message,
        anna: annaError?.message,
        liam: liamError?.message,
      },
    })
  } catch (error) {
    console.error("Error in debug API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        tables: [],
        matches_columns: [],
        sample_records: [],
        total_count: 0,
        anna_data: [],
        liam_data: [],
      },
      { status: 500 },
    )
  }
}
