import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("=== CHECKING DATABASE IDENTITY ===")

    // Try to run the same query you ran in the dashboard
    const { data, error } = await supabase.rpc("sql", {
      query: "SELECT current_database(), current_user, version()",
    })

    if (error) {
      // If RPC doesn't work, try a different approach
      console.log("RPC failed, trying alternative method:", error)

      // Try using a raw SQL query through a function call
      const { data: versionData, error: versionError } = await supabase
        .from("information_schema.tables")
        .select("table_schema")
        .limit(1)

      if (versionError) {
        return Response.json({
          success: false,
          error: "Cannot execute database queries",
          details: versionError.message,
          code: versionError.code,
          hint: versionError.hint,
          connection_info: {
            supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
          },
        })
      }

      // If we can access information_schema, we're connected but can't run custom SQL
      return Response.json({
        success: true,
        message: "Connected to database but cannot run custom SQL queries",
        database_accessible: true,
        custom_sql_available: false,
        connection_info: {
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          can_access_schema: true,
        },
      })
    }

    return Response.json({
      success: true,
      message: "✅ Database identity retrieved successfully",
      database_info: data[0],
      connection_info: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        custom_sql_available: true,
      },
    })
  } catch (error) {
    console.error("Database identity check error:", error)
    return Response.json({
      success: false,
      error: "Failed to check database identity",
      details: error instanceof Error ? error.message : "Unknown error",
      connection_info: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        error_type: error instanceof Error ? error.constructor.name : "Unknown",
      },
    })
  }
}
