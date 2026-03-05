import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

/** GET: List public groups (visible to all RecruitNC users). For discover/browse. */
export async function GET() {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from("messaging_threads")
    .select("id, name, type, last_message_at")
    .eq("type", "group")
    .is("archived_at", null)
    .eq("visibility", "public")
    .order("last_message_at", { ascending: false })
    .limit(50)

  if (error) {
    if ((error as { code?: string }).code === "42703") {
      return NextResponse.json({ threads: [] })
    }
    console.error("[messaging/threads/public]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const threads = (rows ?? []).map((r) => ({
    id: (r as { id: string }).id,
    name: (r as { name: string }).name,
    type: (r as { type: string }).type,
    last_message_at: (r as { last_message_at: string }).last_message_at,
  }))

  return NextResponse.json({ threads })
}
