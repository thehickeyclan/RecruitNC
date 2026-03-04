import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

export async function PATCH(_request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("messaging_thread_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .select("thread_id, last_read_at")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json({ ok: true, last_read_at: data.last_read_at })
}
