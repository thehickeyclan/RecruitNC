import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

export async function POST() {
  try {
    const supabase = createClient()

    // Read the SQL script
    const scriptPath = path.join(process.cwd(), "scripts", "create-media-items-table.sql")
    const sql = fs.readFileSync(scriptPath, "utf8")

    // Execute the SQL script
    const { error } = await supabase.rpc("execute_sql", { sql })

    if (error) {
      console.error("Error executing SQL script:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Media items table created successfully",
    })
  } catch (error) {
    console.error("Error creating media items table:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
