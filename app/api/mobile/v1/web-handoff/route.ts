import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * A one-time sign-in for the web page the app is about to open.
 *
 * The app opens web pages in a Safari sheet, and that sheet has its own cookie jar — Apple keeps
 * it apart from both Safari and the app. So a coach signed in to the app arrives at a profile
 * signed out, and everything the page decides by who is looking (the scouting report button
 * first among them) quietly disappears. It reads as the feature not existing.
 *
 * Handing over the app's own refresh token would look simpler and would break the app: Supabase
 * rotates refresh tokens, so the first time the sheet refreshed, the app's copy would be spent
 * and the app would be signed out. Instead this mints a fresh magic-link token for the same
 * account, which the page exchanges for a session of its own. No email is sent — generateLink
 * only returns the link.
 *
 * Bearer only. The token is the account, so it goes to nobody who has not already proven to be
 * that account, and a cookie-signed website has no sheet to hand anything to.
 */
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!bearer) return NextResponse.json({ error: "Sign in first." }, { status: 401 })

  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(bearer)
  const user = userData?.user
  if (userError || !user) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: "This account has no email to sign in with." }, { status: 409 })

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) {
    console.error("[web-handoff] generateLink failed", error?.message)
    return NextResponse.json({ error: "Could not sign you in on the web." }, { status: 500 })
  }

  return NextResponse.json(
    { tokenHash, userId: user.id },
    // A sign-in token: nothing between here and the phone should keep a copy.
    { headers: { "Cache-Control": "no-store" } },
  )
}
