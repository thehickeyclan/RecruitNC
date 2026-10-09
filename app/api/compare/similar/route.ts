/** Wrestlers to compare this one against, one tap each. Same gate as the comparison itself. */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { mayUseComparison } from "@/lib/compare-access"
import { loadSimilarWrestlers } from "@/lib/similar-wrestlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const id = String(new URL(request.url).searchParams.get("id") ?? "").trim()
  if (!id) return NextResponse.json({ similar: [] })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!mayUseComparison({ profile, userId: user.id })) return NextResponse.json({ error: "For verified college coaches." }, { status: 403 })
  return NextResponse.json({ similar: await loadSimilarWrestlers(admin, id) })
}
