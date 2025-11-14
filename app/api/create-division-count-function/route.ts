import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Read the SQL file
    const sqlPath = path.join(process.cwd(), "scripts", "create_division_count_function.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      // Try direct SQL if RPC fails
      const { error: directError } = await supabase.rpc("get_division_counts")

      if (directError && directError.message.includes('function "get_division_counts" does not exist')) {
        // Function doesn't exist, we need to create it
        return NextResponse.json({
          success: false,
          error: "Function doesn't exist. Please run the SQL script manually.",
          sqlScript: sql,
        })
      }

      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Division count function created successfully",
    })
  } catch (error) {
    console.error("Error creating division count function:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
