import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if user is authenticated and is admin
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if column already exists
    const { data: columnExists, error: checkError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", "user_profiles")
      .eq("column_name", "last_login_at")

    if (checkError) {
      console.error("Error checking column:", checkError)
      return NextResponse.json({ error: "Failed to check column existence" }, { status: 500 })
    }

    if (columnExists && columnExists.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Column already exists",
      })
    }

    // Add the column
    const { error: alterError } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE user_profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;",
    })

    if (alterError) {
      console.error("Error adding column:", alterError)
      return NextResponse.json({ error: "Failed to add column" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Column added successfully",
    })
  } catch (error) {
    console.error("Error in add-last-login-column:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
