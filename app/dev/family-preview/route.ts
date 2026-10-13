/**
 * The recruiting portal as one named family sees it, on a developer's machine.
 *
 *   /dev/family-preview?family=parent@example.com          as that account
 *   /dev/family-preview?family=parent@example.com&blue=1   as that account, if it were a Blue member
 *   /dev/family-preview?clear=1                            back to yourself
 *
 * Sets a cookie the portal's pages read (lib/recruiting/portal-viewer.ts) and sends you to the
 * Command Center. Local development only, admins only, and read-only: saving still acts as you.
 */
import { NextResponse, type NextRequest } from "next/server"

import { PREVIEW_COOKIE } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 })
  const url = new URL(request.url)
  if (url.searchParams.get("clear")) {
    const response = NextResponse.redirect(new URL("/my-recruiting", url))
    response.cookies.delete(PREVIEW_COOKIE)
    return response
  }
  const family = String(url.searchParams.get("family") ?? "").trim()
  if (!family) return new NextResponse("Add ?family=email or ?family=user-id (and &blue=1 to view as a Blue member)", { status: 400 })
  const { data: profile } = await createAdminClient()
    .from("user_profiles")
    .select("user_id")
    .or(family.includes("@") ? `email.ilike.${family}` : `user_id.eq.${family}`)
    .maybeSingle()
  if (!profile) return new NextResponse(`No account for ${family}`, { status: 404 })
  const response = NextResponse.redirect(new URL(url.searchParams.get("to") || "/my-recruiting", url))
  response.cookies.set(PREVIEW_COOKIE, `${profile.user_id}${url.searchParams.get("blue") ? ":blue" : ""}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 })
  return response
}
