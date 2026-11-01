import { NextResponse } from "next/server"

import { createEmailLinkClient } from "@/lib/supabase/email-link-client"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"

/**
 * "Email me a link to sign in": a one-tap sign-in for an account that already exists.
 *
 * On launch day nine families who already had an account tried to sign up to claim, were told
 * so, and almost none got back in: they did not remember the password (31 Oct 2026). The link
 * comes through the Send Email hook (lib/auth-email.ts) and lands on our callback, so it works
 * from any browser, and it confirms an address that was never confirmed. It never creates an
 * account, and the answer is the same whether or not one exists.
 */
export async function POST(request: Request) {
  const { email, returnTo } = (await request.json().catch(() => ({}))) as { email?: unknown; returnTo?: unknown }
  const address = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return NextResponse.json({ error: "Enter the email address on your account." }, { status: 400 })
  }
  const next =
    typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") && !returnTo.startsWith("/auth/")
      ? returnTo
      : null
  const base =
    stagedBrandForHost(request.headers.get("host")) === "national"
      ? "https://www.recruitwrestlers.com"
      : process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
  const { error } = await createEmailLinkClient().auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: false, emailRedirectTo: `${base}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
  })
  // No account is the same answer as an account: nobody learns whose address is registered here.
  if (error && !/signups not allowed|user not found/i.test(error.message)) {
    if (/rate|seconds|too many/i.test(error.message)) {
      return NextResponse.json({ error: "A link was just sent. Check your email, or try again in a minute." }, { status: 429 })
    }
    console.error("[email-link]", error.message)
    return NextResponse.json({ error: "We couldn't send the link. Try again in a minute." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
