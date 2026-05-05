import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildFundraisingAthleteMatrix } from "@/lib/admin-fundraising-athlete-matrix"

export const dynamic = "force-dynamic"

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/** Unified roster × pin × donor page × parent wiring for admin fundraising ops. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const admin = createAdminClient()
    const payload = await buildFundraisingAthleteMatrix(admin)
    return NextResponse.json(payload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to build matrix"
    console.error("[admin/fundraising-athlete-matrix]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
