import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SQL = `
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS hs_matches_uploaded BOOLEAN DEFAULT false;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT false;
`.trim()
const MANUAL_MSG =
  "Could not add via RPC. Run in Supabase SQL Editor:\n\nALTER TABLE athletes ADD COLUMN IF NOT EXISTS hs_matches_uploaded BOOLEAN DEFAULT false;\nALTER TABLE athletes ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT false;"

/**
 * One-time: add hs_matches_uploaded and admin_reviewed to athletes for profile-inventory.
 * POST /api/run-script/add-hs-matches-column (with auth; recommend admin only in production).
 */
export async function POST() {
  try {
    const supabase = createAdminClient()
    let err = (await supabase.rpc("exec_sql", { sql_query: SQL })).error
    if (err) err = (await supabase.rpc("exec_sql", { sql: SQL })).error
    if (err) err = (await supabase.rpc("exec", { sql: SQL })).error
    if (err) {
      const { error: check } = await supabase.from("athletes").select("hs_matches_uploaded").limit(1)
      if (check) {
        return NextResponse.json({ success: false, message: MANUAL_MSG }, { status: 500 })
      }
    }
    return NextResponse.json({
      success: true,
      message: "Columns athletes.hs_matches_uploaded and admin_reviewed added (or already exist).",
    })
  } catch (err) {
    console.error("[add-hs-matches-column] Error:", err)
    return NextResponse.json({ success: false, message: MANUAL_MSG }, { status: 500 })
  }
}
