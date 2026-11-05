import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { setAccountFamily } from "@/lib/view-as/account-family"
import { VIEW_AS_FAMILY_COOKIE } from "@/lib/view-as/cookie"

/** Stop viewing a family's Command Center: the cookie, and the account's saved family. */
export async function GET(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (user && (user.app_metadata as { view_as_family?: unknown } | undefined)?.view_as_family) {
    await setAccountFamily(createAdminClient(), user.id, null).catch(() => undefined)
  }
  const res = NextResponse.redirect(new URL("/", request.url))
  res.cookies.set(VIEW_AS_FAMILY_COOKIE, "", { path: "/", maxAge: 0 })
  return res
}
