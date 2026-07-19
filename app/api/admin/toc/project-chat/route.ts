import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_chat_messages"

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(75)
  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan.sql",
        messages: [],
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: (data ?? []).reverse() })
}

export async function POST(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const message = String(body.body ?? "").trim()
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      body: message,
      author_email: auth.email,
      author_user_id: auth.userId,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
