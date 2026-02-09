import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Verify the app and your Supabase dashboard are using the same project/database.
 *
 * 1. Deploy and open: GET /api/debug/verify-database
 * 2. Note the projectHost and sampleData.
 * 3. In Supabase dashboard, open SQL Editor and run the query below.
 * 4. If projectHost matches your dashboard URL and the sample rows match, same database.
 */
export async function GET() {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const projectHost = url.replace(/^https?:\/\//, "").replace(/\/$/, "")

    const supabase = createAdminClient()

    // Query that returns identifiable rows - same query you'll run in dashboard
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({
        ok: false,
        projectHost,
        error: error.message,
        hint: "App could not read from 'athletes'. Check RLS or table exists.",
      })
    }

    return NextResponse.json({
      ok: true,
      projectHost,
      sameProjectCheck: "Dashboard URL should contain: " + projectHost.split(".")[0],
      sampleFromApp: athletes ?? [],
      queryToRunInDashboard: `SELECT id, name, college, created_at FROM athletes ORDER BY created_at DESC NULLS LAST LIMIT 5;`,
      instructions: [
        "1. Open Supabase Dashboard → SQL Editor (for project " + projectHost + ")",
        "2. Run the query in 'queryToRunInDashboard' above",
        "3. If the rows match 'sampleFromApp', you are on the same database",
        "4. If your dashboard URL is https://" + projectHost + " then project is the same",
      ],
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
