import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // Read the SQL script
    const scriptPath = join(process.cwd(), "scripts", "add-name-fields-to-user-profiles.sql")
    const sqlScript = readFileSync(scriptPath, "utf8")

    // Execute the script
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sqlScript })

    if (error) {
      console.error("Error executing script:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Successfully added name fields to user_profiles table",
      data,
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json(
      {
        error: "Failed to execute script",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
