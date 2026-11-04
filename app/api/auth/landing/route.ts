import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { landingAfterSignIn } from "@/lib/post-sign-in-destination"

export const dynamic = "force-dynamic"

/**
 * GET ?returnTo=: where this signed-in user should land. The page they asked for, except a college
 * coach, who goes to My Recruits unless it was a link to a wrestler or report (lib/post-sign-in-destination.ts).
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const asked = new URL(request.url).searchParams.get("returnTo")
  const returnTo = asked && asked.startsWith("/") && !asked.startsWith("//") && !asked.startsWith("/auth/") ? asked : null
  const destination = await landingAfterSignIn(createAdminClient(), data.user?.id, returnTo)
  return NextResponse.json({ destination }, { headers: { "Cache-Control": "no-store" } })
}
