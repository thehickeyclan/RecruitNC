import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { authEmailsFor, fromForBrand, type HookEmailData, type HookUser } from "@/lib/auth-email"

export const dynamic = "force-dynamic"

/**
 * Supabase's Send Email hook (Authentication > Hooks): Supabase calls this instead of sending its
 * own template, and the email goes out in the brand of the site the person is on (lib/auth-email).
 *
 * Signed the Standard Webhooks way with SUPABASE_EMAIL_HOOK_SECRET ("v1,whsec_..."). A non-200
 * makes Supabase fail the sign-up, so every failure here answers with a reason it can show.
 */

function verified(body: string, headers: Headers, secret: string): boolean {
  const id = headers.get("webhook-id")
  const ts = headers.get("webhook-timestamp")
  const sigs = headers.get("webhook-signature")
  if (!id || !ts || !sigs) return false
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64")
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64"))
  return sigs.split(" ").some((s) => {
    const got = Buffer.from(s.split(",")[1] ?? "")
    return got.length === expected.length && timingSafeEqual(got, expected)
  })
}

function fail(status: number, message: string) {
  return NextResponse.json({ error: { http_code: status, message } }, { status })
}

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_EMAIL_HOOK_SECRET
  const apiKey = process.env.RESEND_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!secret || !apiKey || !supabaseUrl) return fail(500, "Email is not configured.")

  const body = await request.text()
  if (!verified(body, request.headers, secret)) return fail(401, "Invalid signature.")

  let payload: { user: HookUser; email_data: HookEmailData }
  try {
    payload = JSON.parse(body)
  } catch {
    return fail(400, "Invalid payload.")
  }

  const { brand, emails } = authEmailsFor(payload.user, payload.email_data, supabaseUrl)
  const { Resend } = await import("resend")
  const resend = new Resend(apiKey)
  for (const e of emails) {
    if (!e.to) continue
    let result = await resend.emails.send({ from: fromForBrand(brand), to: [e.to], subject: e.subject, html: e.html, text: e.text })
    // A sender Resend refuses (an unverified domain in RW_EMAIL_FROM) must not stop a sign-up.
    if (result.error && brand === "recruitwrestlers") {
      console.error("[email-hook] RecruitWrestlers sender refused, retrying from NC United's address:", result.error)
      result = await resend.emails.send({ from: "RecruitWrestlers <info@ncwrestlingunited.com>", to: [e.to], subject: e.subject, html: e.html, text: e.text })
    }
    if (result.error) {
      console.error("[email-hook] send failed:", payload.email_data.email_action_type, result.error)
      return fail(500, "We couldn't send the email. Please try again in a minute.")
    }
  }
  return NextResponse.json({})
}
