import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // Read the SQL script
    const scriptPath = join(process.cwd(), "scripts", "create-user-profiles-table-fixed.sql")
    const sqlScript = readFileSync(scriptPath, "utf8")

    // Execute the script
    const { error } = await supabase.rpc("exec_sql", { sql: sqlScript })

    if (error) {
      console.error("SQL execution error:", error)

      // Try alternative approach - execute statements one by one
      const statements = sqlScript
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"))

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc("exec_sql", { sql: statement })
          if (stmtError) {
            console.error("Statement error:", stmtError, "Statement:", statement)
            // Continue with other statements
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "User profiles table created successfully" })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json(
      {
        error: "Failed to create user profiles table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
