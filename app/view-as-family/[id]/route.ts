import { NextResponse, type NextRequest } from "next/server"

import { viewAsRole } from "@/lib/business/view-as-coach"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { VIEW_AS_FAMILY_COOKIE, cleanViewAsId } from "@/lib/view-as/cookie"
import { makeFamilyPass } from "@/lib/view-as/family-pass"
import { setAccountFamily } from "@/lib/view-as/account-family"

/**
 * Open one family's Recruiting Command Center as they see it, read-only (Matt, 4 Nov 2026).
 * Admins see all of it; a business account (Rhett) sees it without contact details, academics or
 * messages. Anyone else is sent home and nothing is set.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = cleanViewAsId((await params).id)
  const home = new URL("/", request.url)
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/auth/signin?returnTo=${encodeURIComponent(new URL(request.url).pathname)}`, request.url))
  const role = id ? await viewAsRole(createAdminClient(), user.id, user.app_metadata) : null
  if (!id || !role) return NextResponse.redirect(home)
  if (role === "business") await setAccountFamily(createAdminClient(), user.id, id)
  const res = NextResponse.redirect(new URL("/my-recruiting", request.url))
  res.cookies.set(VIEW_AS_FAMILY_COOKIE, makeFamilyPass(id, user.id, role), { path: "/", maxAge: 43200, sameSite: "lax", httpOnly: true, secure: true })
  return res
}
