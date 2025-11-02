import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if the last_login_at column exists first
    const { data: columnCheck, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", "user_profiles")
      .eq("column_name", "last_login_at")

    if (columnError || !columnCheck || columnCheck.length === 0) {
      console.log("last_login_at column does not exist, skipping update")
      return NextResponse.json({
        success: true,
        message: "Column does not exist, skipping update",
      })
    }

    // Update the user's last login time
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (updateError) {
      console.error("Error updating last login:", updateError)
      return NextResponse.json({
        success: true,
        message: "Update failed but non-critical",
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in update-last-login:", error)
    return NextResponse.json({
      success: true,
      message: "Error occurred but non-critical",
    })
  }
}
