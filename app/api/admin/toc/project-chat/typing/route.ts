import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_typing_status"

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

function emailFallbackName(email: string): string {
  const local = email.split("@")[0] || email
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

async function displayNameForCurrentUser(admin: ReturnType<typeof createAdminClient>, userId: string, email: string): Promise<string> {
  const { data } = await admin
    .from("user_profiles")
    .select("full_name,first_name,last_name,email")
    .or(`user_id.eq.${userId},email.eq.${email.toLowerCase()}`)
    .limit(1)
    .maybeSingle()

  if (data) {
    const record = data as Record<string, unknown>
    const fullName = String(record.full_name ?? "").trim()
    const first = String(record.first_name ?? "").trim()
    const last = String(record.last_name ?? "").trim()
    const name = fullName || [first, last].filter(Boolean).join(" ")
    if (name) return name
  }
  return emailFallbackName(email)
}

export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 8000).toISOString()
  const { data, error } = await admin
    .from(TABLE)
    .select("user_id,email,name,updated_at")
    .eq("is_typing", true)
    .gte("updated_at", cutoff)
    .neq("email", auth.email.toLowerCase())
    .order("updated_at", { ascending: false })
    .limit(5)

  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan-live-patch.sql.txt",
        users: [],
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const isTyping = Boolean(body.isTyping)
  const admin = createAdminClient()
  const name = await displayNameForCurrentUser(admin, auth.userId, auth.email)
  const now = new Date().toISOString()

  const { error } = await admin.from(TABLE).upsert(
    {
      user_id: auth.userId,
      email: auth.email.toLowerCase(),
      name,
      is_typing: isTyping,
      updated_at: now,
    },
    { onConflict: "email" },
  )

  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({ unavailable: true, setupSql: "docs/sql/toc-project-plan-live-patch.sql.txt" })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
