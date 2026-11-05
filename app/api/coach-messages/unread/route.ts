import { NextResponse, type NextRequest } from "next/server"
import { viewSubject } from "@/lib/view-as/subject"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { messagingSummary } from "@/lib/coach-messages"

/**
 * The badge and whether to show messaging at all: { unread, total, show, canStart }.
 * Signed out: nothing to show. (Older app builds read only `unread`.)
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ unread: 0, total: 0, show: false, canStart: false })
  const admin = createAdminClient()
  const subject = await viewSubject(admin, { id: userId })
  if (subject.viewer === "business") return NextResponse.json({ unread: 0, total: 0, show: false, canStart: false })
  return NextResponse.json(await messagingSummary(admin, subject.subjectId))
}
