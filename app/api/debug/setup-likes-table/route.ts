import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "scripts", "create-likes-table.sql")
    const sql = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql })

    if (error) throw error

    return NextResponse.json({ success: true, message: "Likes table setup completed successfully" })
  } catch (error) {
    console.error("Error setting up likes table:", error)
    return NextResponse.json({ error: "Failed to set up likes table" }, { status: 500 })
  }
}
