import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Match athlete-utils: admin form uses contactEmail (camelCase), phone
const SQL = `
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;
`

/**
 * GET or POST /api/run-script/add-create-profile-columns
 * Adds contact_email and phone columns to athletes table for create-profile form.
 * Open in browser to run.
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
