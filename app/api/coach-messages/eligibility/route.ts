import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { canMessage } from "@/lib/coach-messages"

/**
 * Should this viewer see a "Message" button on this wrestler, and what does it do?
 *
 * Non-coaches get `{ show: false }` so the button never renders for families or fans. A coach
 * staff have not reviewed yet gets the button with an explanation instead of a compose box.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const athleteId = request.nextUrl.searchParams.get("athleteId")?.trim()
  if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ show: false })

  const gate = await canMessage(createAdminClient(), userId, athleteId)
  if (gate.ok) return NextResponse.json({ show: true, canSend: true, threadId: gate.threadId })
  if (gate.reason === "not_coach" || gate.reason === "self" || gate.reason === "no_athlete") {
    return NextResponse.json({ show: false })
  }
  return NextResponse.json({ show: true, canSend: false, threadId: gate.threadId ?? null, reason: gate.reason, message: gate.message })
}
