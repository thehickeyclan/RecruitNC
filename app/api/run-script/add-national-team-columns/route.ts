import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SQL = `
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ultimate_club_duals_2025_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ultimate_club_duals_2024_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ultimate_club_duals_2023_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nhsca_national_duals_2025_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nhsca_national_duals_2024_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nhsca_national_duals_2023_record TEXT;
`

/**
 * GET or POST /api/run-script/add-national-team-columns
 * Adds NC United National Team record columns: Ultimate Club Duals + NHSCA National Duals (2023-2025).
 * Open in browser to run once, or run the SQL manually in Supabase SQL Editor.
 */
async function run() {
  try {
    const supabase = createAdminClient()

    let err = (await supabase.rpc("exec_sql", { sql_query: SQL })).error
    if (err) err = (await supabase.rpc("exec_sql", { sql: SQL })).error
    if (err) err = (await supabase.rpc("exec", { sql: SQL })).error

    if (err) {
      return NextResponse.json({
        success: false,
        error: err.message,
        manualSql: "In Supabase SQL Editor run: " + SQL.trim(),
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
      manualSql: "In Supabase SQL Editor run: " + SQL.trim(),
    }, { status: 500 })
  }
}

export async function GET() {
  return run()
}

export async function POST() {
  return run()
}
