import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import type { TocProjectUser } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

function normalizeUser(row: Record<string, unknown>): TocProjectUser | null {
  const userId = String(row.user_id ?? "").trim()
  const email = String(row.email ?? "").trim().toLowerCase()
  if (!userId || !email) return null
  const fullName = String(row.full_name ?? "").trim()
  const first = String(row.first_name ?? "").trim()
  const last = String(row.last_name ?? "").trim()
  const name = fullName || [first, last].filter(Boolean).join(" ") || email
  return { userId, email, name }
}

function orFilterForQuery(q: string): string {
  const parts = q.split(" ").map((part) => part.trim()).filter(Boolean)
  const filters = [`email.ilike.%${q}%`, `full_name.ilike.%${q}%`, `first_name.ilike.%${q}%`, `last_name.ilike.%${q}%`]
  if (parts.length >= 2) {
    const first = parts[0]
    const last = parts.slice(1).join(" ")
    filters.push(`and(first_name.ilike.%${first}%,last_name.ilike.%${last}%)`)
  }
  return filters.join(",")
}

export async function GET(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const rawQ = searchParams.get("q") ?? ""
  const q = rawQ.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ").slice(0, 80)
  if (q.length < 2) return NextResponse.json({ users: [] })

  const admin = createAdminClient()
  const select = "user_id,email,full_name,first_name,last_name"
  const { data, error } = await admin
    .from("user_profiles")
    .select(select)
    .or(orFilterForQuery(q))
    .not("email", "is", null)
    .limit(8)

  if (error) {
    const pattern = `%${q}%`
    const fallback = await admin.from("user_profiles").select("user_id,email").ilike("email", pattern).not("email", "is", null).limit(8)
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    return NextResponse.json({ users: (fallback.data ?? []).map((row) => normalizeUser(row as Record<string, unknown>)).filter(Boolean) })
  }

  return NextResponse.json({ users: (data ?? []).map((row) => normalizeUser(row as Record<string, unknown>)).filter(Boolean) })
}
