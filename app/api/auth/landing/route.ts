import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { postSignInDestination } from "@/lib/post-sign-in-destination"

export const dynamic = "force-dynamic"

/** GET: where this signed-in user should land - the rankings if they can read them, else the sales page. */
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const destination = await postSignInDestination(createAdminClient(), data.user?.id)
  return NextResponse.json({ destination }, { headers: { "Cache-Control": "no-store" } })
}
