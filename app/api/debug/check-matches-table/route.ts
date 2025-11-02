import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Simple approach - just try to query the table
    const { data: testQuery, error: testError } = await supabase.from("matches").select("*").limit(1)

    if (testError) {
      return Response.json(
        {
          success: false,
          tableExists: false,
          error: "Matches table does not exist",
          details: testError.message,
          message: "You need to create the matches table first",
        },
        { status: 404 },
      )
    }

    // Get record count
    const { count, error: countError } = await supabase.from("matches").select("*", { count: "exact", head: true })

    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase.from("matches").select("*").limit(3)

    // Provide expected table structure
    const expectedColumns = [
      { column_name: "id", data_type: "uuid", is_nullable: "NO", column_default: "gen_random_uuid()" },
      { column_name: "wrestler_id", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "first_name", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "last_name", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "season", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "grade", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "high_school", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "total_matches", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "wins", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "losses", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "pins", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "tech_falls", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "decisions", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "major_decisions", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "forfeits_won", data_type: "integer", is_nullable: "YES", column_default: null },
      { column_name: "pin_percentage", data_type: "numeric", is_nullable: "YES", column_default: null },
      { column_name: "tf_percentage", data_type: "numeric", is_nullable: "YES", column_default: null },
      { column_name: "finishing_percentage", data_type: "numeric", is_nullable: "YES", column_default: null },
      { column_name: "matches", data_type: "jsonb", is_nullable: "YES", column_default: null },
      { column_name: "created_at", data_type: "timestamp", is_nullable: "YES", column_default: "now()" },
    ]

    return Response.json({
      success: true,
      tableExists: true,
      columns: expectedColumns,
      count: count || 0,
      sampleData: sampleData || [],
      message: "Matches table exists and is ready for data",
    })
  } catch (error) {
    console.error("Error checking matches table:", error)
    return Response.json(
      {
        error: "Failed to check matches table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
