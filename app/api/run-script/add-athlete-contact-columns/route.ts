import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Adds cell_number and contact_email for Legacy NC / self-edit compatibility
const SQL = `
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS cell_number TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
`

/**
 * GET or POST /api/run-script/add-athlete-contact-columns
 * Ensures athletes table has phone/cell_number and email columns for self-edit.
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
        manualSql: "In Supabase SQL Editor run:\n" + SQL.trim(),
      }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
      manualSql: "In Supabase SQL Editor run:\n" + SQL.trim(),
    }, { status: 500 })
  }
}

export async function GET() {
  return run()
}

export async function POST() {
  return run()
}
