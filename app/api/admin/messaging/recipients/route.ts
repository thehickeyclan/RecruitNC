import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  countRecipientsWithEmail,
  getAdminMessagingRecipients,
  type AdminMessagingRecipientRow,
} from "@/lib/admin-messaging-recipients"

export const dynamic = "force-dynamic"

export type RecipientRow = AdminMessagingRecipientRow
export type RecipientsResponse = {
  count: number
  recipients: RecipientRow[]
  emailCount?: number
  error?: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** GET: Get recipient user_ids (and contact info) for audience. Query: profile=role | group=blue | group=event:slug | group=forum:groupId. Limit 2000. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = request.nextUrl
  const profileFilter = searchParams.get("profile")?.trim() || null
  const groupFilter = searchParams.get("group")?.trim() || null
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "2000", 10) || 2000, 5000)

  const admin = createAdminClient()
  const allMatching = await getAdminMessagingRecipients(admin, profileFilter, groupFilter, 5000)
  const recipients = allMatching.slice(0, limit)
  const emailCount = countRecipientsWithEmail(allMatching)

  return NextResponse.json({
    count: recipients.length,
    recipients,
    totalMatching: allMatching.length,
    emailCount,
  } as RecipientsResponse & { totalMatching?: number })
}
