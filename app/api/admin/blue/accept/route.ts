import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"

import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { renderBlueAcceptanceEmail, sendBlueAcceptanceEmail } from "@/lib/blue-acceptance-email"

/**
 * Accept a family into Blue: one button, one email.
 *
 * Getting in used to mean generating a registration link on one screen, then copying a drafted
 * subject and body into a mail client on another. This does the whole thing from the interest
 * list - mints the private registration link if the family does not already have an unused one,
 * sends the welcome with the steps in it, and records that it went.
 */

export const dynamic = "force-dynamic"

/**
 * GET: the exact email, rendered, without sending it or minting anything.
 *
 * Nothing about an email is obvious from its code, and this one carries eight steps and a
 * family's only registration link. Read it first.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const interestId = new URL(request.url).searchParams.get("interestId")?.trim()
  let athleteName: string | null = null
  if (interestId) {
    const { data } = await createAdminClient()
      .from("blue_express_interest")
      .select("first_name, last_name")
      .eq("id", interestId)
      .maybeSingle()
    athleteName = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim() || null
  }
  // A sample link: previewing must never burn a real one.
  const { html } = renderBlueAcceptanceEmail({
    athleteName,
    registerUrl: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/blue/register?invite=PREVIEW`,
  })
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
}

const INVITE_DAYS = 30

export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = (await request.json().catch(() => null)) as { interestId?: string } | null
  const interestId = body?.interestId?.trim()
  if (!interestId) return NextResponse.json({ error: "interestId required" }, { status: 400 })

  const db = createAdminClient()
  const { data: interest, error: loadError } = await db
    .from("blue_express_interest")
    .select("id, first_name, last_name, parent_email, cell_phone, approval_email_sent_at")
    .eq("id", interestId)
    .single()

  if (loadError || !interest) return NextResponse.json({ error: "Interest not found" }, { status: 404 })

  const to = String(interest.parent_email ?? "").trim()
  if (!to) {
    return NextResponse.json(
      { error: "No email on this row. Add one before sending the welcome." },
      { status: 400 },
    )
  }

  /*
   * Reuse an unused invite rather than minting a second one: a family with two live links will
   * use the older one and wonder why it says expired.
   */
  const nowIso = new Date().toISOString()
  const { data: existing } = await db
    .from("blue_invites")
    .select("token, expires_at")
    .eq("email", to)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)

  let token = existing?.[0]?.token as string | undefined
  if (!token) {
    token = randomBytes(24).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS)
    const { error: inviteError } = await db.from("blue_invites").insert({
      token,
      email: to,
      expires_at: expiresAt.toISOString(),
      interest_id: interest.id,
      notes: "Created by the Blue acceptance email",
    })
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const registerUrl = `${baseUrl}/blue/register?invite=${encodeURIComponent(token)}`
  const athleteName = [interest.first_name, interest.last_name].filter(Boolean).join(" ").trim() || null

  const sent = await sendBlueAcceptanceEmail({ to, athleteName, registerUrl })
  if (!sent.success) return NextResponse.json({ error: sent.error || "Email failed" }, { status: 502 })

  await db
    .from("blue_express_interest")
    .update({ approval_email_sent_at: nowIso, status: "approved" })
    .eq("id", interest.id)

  return NextResponse.json({ ok: true, to, registerUrl, sentAt: nowIso })
}
