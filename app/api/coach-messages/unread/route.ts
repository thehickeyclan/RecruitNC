import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { unreadCount } from "@/lib/coach-messages"

/** Unread conversations, for the badge. Zero when signed out. */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ unread: 0 })
  return NextResponse.json({ unread: await unreadCount(createAdminClient(), userId) })
}
