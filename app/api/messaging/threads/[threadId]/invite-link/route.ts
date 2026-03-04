import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"
import { randomBytes } from "crypto"

/** GET: Get or create invite link for the thread. Thread admin only. Requires messaging_threads.invite_token column. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  const supabase = await createClient()
  const { data: myMember } = await supabase
    .from("messaging_thread_members")
    .select("role")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!myMember || (myMember as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Only group admins can get the invite link" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: thread, error: fetchErr } = await admin
    .from("messaging_threads")
    .select("id, invite_token")
    .eq("id", threadId)
    .single()

  if (fetchErr || !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 })
  }

  const row = thread as { invite_token?: string | null }
  let token = row.invite_token
  if (!token) {
    token = randomBytes(16).toString("base64url")
    const { error: updateErr } = await admin
      .from("messaging_threads")
      .update({ invite_token: token })
      .eq("id", threadId)
    if (updateErr) {
      if ((updateErr as { code?: string }).code === "42703") {
        return NextResponse.json(
          { error: "Invite links not configured. Run: ALTER TABLE messaging_threads ADD COLUMN IF NOT EXISTS invite_token text UNIQUE;" },
          { status: 501 }
        )
      }
      console.error("[messaging/invite-link]", updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
  const url = `${baseUrl.replace(/\/$/, "")}/messages/join?token=${encodeURIComponent(token)}`
  return NextResponse.json({ url, token })
}
