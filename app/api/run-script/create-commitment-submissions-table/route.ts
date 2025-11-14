import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // Read the SQL file
    const sqlPath = join(process.cwd(), "scripts", "create-commitment-submissions-table.sql")
    const sql = readFileSync(sqlPath, "utf8")

    console.log("Executing SQL:", sql)

    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql })

    if (error) {
      console.error("SQL execution error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("SQL executed successfully:", data)

    return NextResponse.json({
      success: true,
      message: "Commitment submissions table created successfully",
      data,
    })
  } catch (error) {
    console.error("Error creating commitment submissions table:", error)
    return NextResponse.json(
      {
        error: "Failed to create table",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
