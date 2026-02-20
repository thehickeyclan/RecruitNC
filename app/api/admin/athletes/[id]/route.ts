import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapDbToAthlete } from "@/lib/athlete-utils"

/**
 * GET /api/admin/athletes/[id]
 * Returns one athlete by id for admin edit page. Uses ONLY createAdminClient()
 * so this request never blocks on server-side auth (same root cause as profile hang).
 * Caller must be on /admin (AuthGuard); we do not duplicate auth here to avoid createClient().
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.from("athletes").select("*").eq("id", id).single()

    if (error || !data) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const mapped = await mapDbToAthlete(data)
    return NextResponse.json({ success: true, data: mapped })
  } catch (err) {
    console.error("[admin/athletes/[id]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
