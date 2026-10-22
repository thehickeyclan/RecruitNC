import { NextResponse, type NextRequest } from "next/server"

import { isAdminUser } from "@/lib/admin-api-gate"
import { familyAthleteIds } from "@/lib/coach-messages"
import { loadAnswers, saveAnswers } from "@/lib/questionnaire/answers"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * A wrestler's questionnaire answers (lib/questionnaire). Private: only the wrestler's own family
 * with Command Center access, or staff. A coach, even an approved one, never reads these.
 */
async function allowed(athleteId: string) {
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !athleteId) return { admin, userId: null }
  if (await isAdminUser(userId)) return { admin, userId }
  if (!hasPortalAccess(viewer)) return { admin, userId: null }
  const ids = await familyAthleteIds(admin, userId)
  return { admin, userId: ids.includes(athleteId) ? userId : null }
}

export async function GET(request: NextRequest) {
  const athleteId = request.nextUrl.searchParams.get("athlete") ?? ""
  const { admin, userId } = await allowed(athleteId)
  if (!userId) return NextResponse.json({ error: "Not your wrestler." }, { status: 403 })
  return NextResponse.json(await loadAnswers(admin, athleteId), { headers: { "Cache-Control": "no-store" } })
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { athleteId?: unknown; answers?: unknown } | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  const { admin, userId } = await allowed(athleteId)
  if (!userId) return NextResponse.json({ error: "Not your wrestler." }, { status: 403 })
  const result = await saveAnswers(admin, athleteId, body?.answers, userId)
  if ("error" in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
}
