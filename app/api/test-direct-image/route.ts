import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("=== TESTING MATCHES TABLE ACCESS ===")

    // Simple test - try to access matches table
    const { data: matchesData, error: matchesError } = await supabase.from("matches").select("*").limit(1)

    if (matchesError) {
      console.error("Matches table error:", matchesError)
      return Response.json({
        success: false,
        error: "Cannot access matches table",
        details: matchesError.message,
        code: matchesError.code,
        hint: matchesError.hint,
        suggestion: "The table exists in dashboard but API cannot access it. Try recreating the table.",
      })
    }

    // Test if we can also write
    const testRecord = {
      wrestler_id: "test_" + Date.now(),
      first_name: "Test",
      last_name: "User",
      season: "2024-25",
      total_matches: 0,
      wins: 0,
      losses: 0,
      matches: [],
    }

    const { data: insertData, error: insertError } = await supabase.from("matches").insert(testRecord).select()

    if (insertError) {
      return Response.json({
        success: true,
        message: "✅ Can read matches table but write failed",
        read_access: true,
        write_access: false,
        write_error: insertError.message,
        existing_records: matchesData?.length || 0,
      })
    }

    // Clean up test record
    if (insertData && insertData.length > 0) {
      await supabase.from("matches").delete().eq("id", insertData[0].id)
    }

    return Response.json({
      success: true,
      message: "✅ Full access to matches table confirmed!",
      read_access: true,
      write_access: true,
      existing_records: matchesData?.length || 0,
      ready_for_upload: true,
    })
  } catch (error) {
    console.error("Test error:", error)
    return Response.json({
      success: false,
      error: "Test failed with exception",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    console.log("=== ATTEMPTING TO UPLOAD SAMPLE DATA ===")

    // Try to insert the sample data
    const { data, error } = await supabase.from("matches").insert(body).select()

    if (error) {
      console.error("Insert error:", error)
      return Response.json({
        success: false,
        error: "Failed to insert sample data",
        details: error.message,
        code: error.code,
        hint: error.hint,
      })
    }

    return Response.json({
      success: true,
      message: "✅ Sample data uploaded successfully!",
      data: data,
      record_id: data[0]?.id,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({
      success: false,
      error: "Upload failed with exception",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function PATCH() {
  try {
    console.log("=== RUNNING FULL DATABASE DIAGNOSTICS ===")

    const diagnostics = {
      connection_test: null,
      environment_check: null,
      accessible_tables: [],
      table_permissions: {},
      schema_info: null,
    }

    // Test 1: Basic connection
    try {
      const { data, error } = await supabase.from("athletes").select("count").limit(1)
      diagnostics.connection_test = {
        success: !error,
        error: error?.message,
        can_access_athletes: !error,
      }
    } catch (e) {
      diagnostics.connection_test = {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      }
    }

    // Test 2: Environment check
    diagnostics.environment_check = {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      anon_key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
    }

    // Test 3: Check what tables we can access
    const knownTables = [
      "athletes",
      "colleges",
      "high_schools",
      "clubs",
      "matches",
      "logo_mappings",
      "media_items",
      "likes",
      "prospect_rankings",
    ]

    for (const table of knownTables) {
      try {
        const { data, error } = await supabase.from(table).select("count").limit(1)
        if (!error) {
          diagnostics.accessible_tables.push(table)
          diagnostics.table_permissions[table] = "accessible"
        } else {
          diagnostics.table_permissions[table] = error.message
        }
      } catch (e) {
        diagnostics.table_permissions[table] = e instanceof Error ? e.message : "Unknown error"
      }
    }

    // Test 4: Try to get schema information
    try {
      const { data, error } = await supabase.rpc("version")
      diagnostics.schema_info = {
        version_check: !error,
        error: error?.message,
      }
    } catch (e) {
      diagnostics.schema_info = {
        version_check: false,
        error: e instanceof Error ? e.message : "Unknown error",
      }
    }

    return Response.json({
      success: true,
      message: "✅ Full diagnostics completed",
      diagnostics,
      summary: {
        total_accessible_tables: diagnostics.accessible_tables.length,
        matches_table_accessible: diagnostics.accessible_tables.includes("matches"),
        connection_working: diagnostics.connection_test?.success || false,
        recommendation: diagnostics.accessible_tables.includes("matches")
          ? "Matches table is accessible - try uploading data"
          : "Matches table not accessible - recreate the table with proper permissions",
      },
    })
  } catch (error) {
    console.error("Diagnostics error:", error)
    return Response.json({
      success: false,
      error: "Diagnostics failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
