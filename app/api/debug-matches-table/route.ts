import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("=== DEBUGGING MATCHES TABLE ===")

    // Test 1: Try to query the table directly
    console.log("Test 1: Direct table query...")
    const { data: directData, error: directError } = await supabase.from("matches").select("*").limit(1)

    console.log("Direct query result:", { directData, directError })

    // Test 2: Try raw SQL to check if table exists
    console.log("Test 2: Raw SQL check...")
    const { data: sqlData, error: sqlError } = await supabase.rpc("exec_sql", {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matches';",
    })

    console.log("SQL check result:", { sqlData, sqlError })

    // Test 3: List all tables
    console.log("Test 3: List all tables...")
    const { data: tablesData, error: tablesError } = await supabase.rpc("exec_sql", {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
    })

    console.log("All tables result:", { tablesData, tablesError })

    return Response.json({
      test1_direct_query: {
        data: directData,
        error: directError,
      },
      test2_sql_check: {
        data: sqlData,
        error: sqlError,
      },
      test3_all_tables: {
        data: tablesData,
        error: tablesError,
      },
    })
  } catch (error) {
    console.error("Debug error:", error)
    return Response.json({
      error: "Debug failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
