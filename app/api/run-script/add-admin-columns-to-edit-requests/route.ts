import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // Read the SQL script
    const scriptPath = path.join(process.cwd(), "scripts", "add-admin-columns-to-edit-requests.sql")
    const sqlScript = fs.readFileSync(scriptPath, "utf8")

    // Execute the script
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sqlScript })

    if (error) {
      console.error("Error executing SQL script:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Edit requests table updated successfully with admin columns and proper relationships",
      data,
    })
  } catch (error) {
    console.error("Error running script:", error)
    return NextResponse.json({ error: "Failed to run script" }, { status: 500 })
  }
}
