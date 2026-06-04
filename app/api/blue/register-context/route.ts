import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadBlueRegisterContext } from "@/lib/blue-register-resolve"

export const dynamic = "force-dynamic"

/** GET: Signed-in parent profile + linked athletes for Blue registration prefill. Optional ?invite=TOKEN pulls interest application data. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to register for Blue." }, { status: 401 })
  }

  const inviteToken = request.nextUrl.searchParams.get("invite")?.trim() || null

  try {
    const admin = createAdminClient()
    const context = await loadBlueRegisterContext(admin, user.id, user.email ?? "", { inviteToken })
    return NextResponse.json(context)
  } catch (e) {
    console.error("[blue/register-context]", e)
    return NextResponse.json({ error: "Could not load registration info." }, { status: 500 })
  }
}
