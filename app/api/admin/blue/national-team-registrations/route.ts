import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

const NHSCA_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const eventParam = request.nextUrl.searchParams.get("event")?.trim()
  const eventSlugs = eventParam ? [eventParam] : NHSCA_SLUGS

  const { data: rows, error } = await admin
    .from("national_team_event_registrations")
    .select("*")
    .in("event_slug", eventSlugs)
    .order("created_at", { ascending: false })

  if (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { error: "Table national_team_event_registrations does not exist. Run scripts/208-national-team-registrations-and-products.md (SQL block) in Supabase SQL Editor." },
        { status: 503 }
      )
    }
    console.error("[admin/blue/national-team-registrations]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const registrations = (rows ?? []) as (typeof rows)[0] & { parent_user_id?: string | null; linked_account_email?: string | null }[]
  const parentUserIds = [...new Set(registrations.map((r) => r.parent_user_id).filter(Boolean))] as string[]
  const linkedEmailByUserId = new Map<string, string>()
  if (parentUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, email")
      .in("user_id", parentUserIds)
    for (const p of profiles ?? []) {
      const row = p as { user_id: string; email?: string | null }
      if (row.email?.trim()) linkedEmailByUserId.set(row.user_id, row.email.trim())
    }
    const missing = parentUserIds.filter((id) => !linkedEmailByUserId.has(id))
    if (missing.length > 0) {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      for (const u of users ?? []) {
        if (u.email?.trim() && missing.includes(u.id)) linkedEmailByUserId.set(u.id, u.email.trim())
      }
    }
  }
  for (const r of registrations) {
    const uid = r.parent_user_id
    r.linked_account_email = uid ? linkedEmailByUserId.get(uid) ?? null : null
  }

  const regIds = registrations.map((r) => (r as { id: string }).id).filter(Boolean)
  const receiptSentAtByReg = new Map<string, string>()
  if (regIds.length > 0) {
    const { data: receiptRows, error: receiptErr } = await admin
      .from("national_team_fee_receipt_emails")
      .select("registration_id, sent_at")
      .in("registration_id", regIds)
    if (!receiptErr && receiptRows) {
      for (const rr of receiptRows as { registration_id: string; sent_at: string }[]) {
        receiptSentAtByReg.set(rr.registration_id, rr.sent_at)
      }
    }
  }
  for (const r of registrations) {
    const id = (r as { id: string }).id
    ;(r as { fee_receipt_email_sent_at?: string | null }).fee_receipt_email_sent_at = receiptSentAtByReg.get(id) ?? null
  }

  const paid = registrations.filter((r) => r.status === "paid" || r.order_id)
  const pending = registrations.filter((r) => r.status !== "paid" && !r.order_id)

  return NextResponse.json({
    registrations,
    paidCount: paid.length,
    pendingCount: pending.length,
    eventSlugs,
  })
}
