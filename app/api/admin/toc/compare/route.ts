import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { compareTocAthletes } from "@/lib/toc/athlete-compare"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { athleteIdA?: string; athleteIdB?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const athleteIdA = body.athleteIdA?.trim()
  const athleteIdB = body.athleteIdB?.trim()
  if (!athleteIdA || !athleteIdB) {
    return NextResponse.json({ error: "athleteIdA and athleteIdB are required" }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const comparison = await compareTocAthletes(admin, athleteIdA, athleteIdB)
    return NextResponse.json({ comparison })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Compare failed"
    console.error("[admin/toc/compare]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
