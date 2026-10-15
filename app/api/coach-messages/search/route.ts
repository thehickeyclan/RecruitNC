import { NextResponse, type NextRequest } from "next/server"

import { listThreads } from "@/lib/coach-messages"
import { searchMessages } from "@/lib/coach-messages-extras"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Words inside this account's own conversations: ?q=. Never anyone else's. */
export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const admin = createAdminClient()
  const threads = await listThreads(admin, userId)
  const results = await searchMessages(admin, threads.map((t) => t.id), request.nextUrl.searchParams.get("q") ?? "")
  return NextResponse.json({ results })
}
