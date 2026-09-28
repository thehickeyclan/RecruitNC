import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { recordUnsubscribe, verifyUnsubscribeToken } from "@/lib/email-unsubscribe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * One-click unsubscribe, for the mail client rather than the person.
 *
 * Gmail and Yahoo POST to the `List-Unsubscribe` address when somebody uses their native
 * button, with no session, no cookies and no chance to confirm. RFC 8058 requires that the
 * POST alone is enough, so this records the opt-out and answers 200 — anything else and the
 * provider treats the header as broken and stops showing the button.
 *
 * No authentication: the token is the authority, and it is an HMAC of the address. There is
 * nothing to gain by forging one except removing an address you already know, which is what
 * the endpoint is for.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const email = url.searchParams.get("e") ?? ""
  const token = url.searchParams.get("t") ?? ""

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 })
  }

  const result = await recordUnsubscribe(createAdminClient(), email, "one_click")
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not unsubscribe" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** Some clients probe with GET; answer the same way rather than 405. */
export async function GET(request: NextRequest) {
  return POST(request)
}
