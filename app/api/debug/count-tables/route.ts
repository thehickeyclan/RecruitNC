import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("=== COUNTING TABLES IN APP DATABASE ===")

    // Get all tables in the public schema using direct SQL query
    const { data: tables, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_type", "BASE TABLE")
      .order("table_name")

    if (error) {
      console.log("First method failed, trying raw SQL...")

      // Try alternative method with raw SQL
      const { data: rawData, error: rawError } = await supabase.rpc("exec_sql", {
        sql: `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
          `,
      })

      if (rawError) {
        console.log("Raw SQL also failed, trying simple table check...")

        // Try checking specific tables we know should exist
        const knownTables = ["athletes", "logo_mappings", "media_items", "matches"]
        const tableChecks = []

        for (const tableName of knownTables) {
          try {
            const { error: checkError } = await supabase.from(tableName).select("*").limit(1)

            tableChecks.push({
              table: tableName,
              exists: !checkError,
              error: checkError?.message || null,
            })
          } catch (e) {
            tableChecks.push({
              table: tableName,
              exists: false,
              error: e instanceof Error ? e.message : "Unknown error",
            })
          }
        }

        return Response.json({
          success: true,
          method: "table_check",
          table_checks: tableChecks,
          existing_tables: tableChecks.filter((t) => t.exists).map((t) => t.table),
          missing_tables: tableChecks.filter((t) => !t.exists).map((t) => t.table),
          estimated_count: tableChecks.filter((t) => t.exists).length,
          note: "Could not get full table list, showing known table status",
        })
      }

      return Response.json({
        success: true,
        method: "raw_sql",
        tables: rawData || [],
        table_count: rawData?.length || 0,
      })
    }

    // Get just the table names as an array
    const tableNames = tables?.map((row: any) => row.table_name) || []

    // Check for specific tables we care about
    const importantTables = [
      "athletes",
      "matches",
      "logo_mappings",
      "media_items",
      "college_master",
      "likes",
      "user_profiles",
      "edit_requests",
    ]

    const existingImportantTables = importantTables.filter((table) => tableNames.includes(table))

    const missingImportantTables = importantTables.filter((table) => !tableNames.includes(table))

    return Response.json({
      success: true,
      method: "information_schema",
      table_count: tableNames.length,
      tables: tableNames,
      important_tables: {
        existing: existingImportantTables,
        missing: missingImportantTables,
      },
      database_info: {
        has_athletes: tableNames.includes("athletes"),
        has_matches: tableNames.includes("matches"),
        has_logo_mappings: tableNames.includes("logo_mappings"),
        has_media_items: tableNames.includes("media_items"),
      },
    })
  } catch (error) {
    console.error("Count tables error:", error)
    return Response.json({
      success: false,
      error: "Failed to count tables",
      details: error instanceof Error ? error.message : "Unknown error",
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    })
  }
}
