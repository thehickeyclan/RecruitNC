import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { familyAthleteIds } from "@/lib/coach-messages"
import { SEARCH_HIDDEN_KEY, profileSearchHidden } from "@/lib/profile-search"

export const dynamic = "force-dynamic"

/**
 * Whether this wrestler's profile may appear in search engines (lib/profile-search.ts). Only the
 * wrestler's own family (the account that claimed it, or a linked parent) or staff may change it.
 */
async function authorise(id: string) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return { ok: false as const, status: 401 }
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).maybeSingle()
  const staff = me?.is_admin === true || me?.role === "admin"
  if (!staff && !(await familyAthleteIds(admin, user.id).catch(() => [] as string[])).includes(id)) return { ok: false as const, status: 403 }
  return { ok: true as const, admin, userId: user.id }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorise(id)
  if (!auth.ok) return NextResponse.json({ error: "Not allowed" }, { status: auth.status })
  const { data } = await auth.admin.from("athletes").select("custom_attributes").eq("id", id).maybeSingle()
  return NextResponse.json({ hidden: profileSearchHidden(data?.custom_attributes) }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorise(id)
  if (!auth.ok) return NextResponse.json({ error: "Not allowed" }, { status: auth.status })
  const body = (await req.json().catch(() => ({}))) as { hidden?: unknown }
  if (typeof body.hidden !== "boolean") return NextResponse.json({ error: "hidden must be true or false" }, { status: 400 })
  const { data } = await auth.admin.from("athletes").select("custom_attributes").eq("id", id).maybeSingle()
  const current = (data?.custom_attributes && typeof data.custom_attributes === "object" ? data.custom_attributes : {}) as Record<string, unknown>
  const next = { ...current, [SEARCH_HIDDEN_KEY]: body.hidden, search_hidden_changed_at: new Date().toISOString(), search_hidden_changed_by: auth.userId }
  const { error } = await auth.admin.from("athletes").update({ custom_attributes: next }).eq("id", id)
  if (error) return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  return NextResponse.json({ hidden: body.hidden })
}
