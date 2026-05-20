import type { SupabaseClient } from "@supabase/supabase-js"

/** NHSCA Duals 2026 — National & Select event slugs (same as admin payments). */
export const NHSCA_DUALS_2026_EVENT_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"] as const

export type NhscaDuals2026Registration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  parent_user_id?: string | null
  linked_account_email?: string | null
  high_school: string
  graduation_year: string
  primary_weight: string
  reg_fee_cents: number
  apparel_fee_cents: number
  status: string
  order_id: string | null
  record?: string | null
  created_at: string
  fee_receipt_email_sent_at?: string | null
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase()
}

async function enrichLinkedAccountEmails(
  admin: SupabaseClient,
  registrations: NhscaDuals2026Registration[]
): Promise<void> {
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
}

async function attachReceiptSentAt(
  admin: SupabaseClient,
  registrations: NhscaDuals2026Registration[]
): Promise<void> {
  const regIds = registrations.map((r) => r.id).filter(Boolean)
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
    r.fee_receipt_email_sent_at = receiptSentAtByReg.get(r.id) ?? null
  }
}

/**
 * Load NHSCA Duals 2026 registrations — same table/query as admin national-team-payments.
 * Admins: all rows for both slugs. Families: rows where parent_user_id or parent_email matches viewer.
 */
export async function listNhscaDuals2026Registrations(
  admin: SupabaseClient,
  opts: {
    isAdmin: boolean
    viewerUserId?: string | null
    viewerEmail?: string | null
    eventSlug?: string | null
  }
): Promise<NhscaDuals2026Registration[]> {
  const eventSlugs = opts.eventSlug ? [opts.eventSlug] : [...NHSCA_DUALS_2026_EVENT_SLUGS]

  const selectCols =
    "id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, parent_user_id, high_school, graduation_year, primary_weight, reg_fee_cents, apparel_fee_cents, status, order_id, record, created_at"

  let rows: NhscaDuals2026Registration[] = []

  if (opts.isAdmin) {
    const { data, error } = await admin
      .from("national_team_event_registrations")
      .select(selectCols)
      .in("event_slug", eventSlugs)
      .order("created_at", { ascending: false })
    if (error) throw error
    rows = (data ?? []) as NhscaDuals2026Registration[]
  } else {
    const viewerEmail = normalizeEmail(opts.viewerEmail)
    const viewerUserId = opts.viewerUserId?.trim() || null
    const byId = new Map<string, NhscaDuals2026Registration>()

    if (viewerUserId) {
      const { data, error } = await admin
        .from("national_team_event_registrations")
        .select(selectCols)
        .in("event_slug", eventSlugs)
        .eq("parent_user_id", viewerUserId)
        .order("created_at", { ascending: false })
      if (error) throw error
      for (const r of (data ?? []) as NhscaDuals2026Registration[]) byId.set(r.id, r)
    }

    if (viewerEmail) {
      const { data, error } = await admin
        .from("national_team_event_registrations")
        .select(selectCols)
        .in("event_slug", eventSlugs)
        .ilike("parent_email", viewerEmail)
        .order("created_at", { ascending: false })
      if (error) throw error
      for (const r of (data ?? []) as NhscaDuals2026Registration[]) byId.set(r.id, r)
    }

    rows = [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  await enrichLinkedAccountEmails(admin, rows)
  await attachReceiptSentAt(admin, rows)
  return rows
}

export function nhscaDualsRegistrationTotalCents(r: Pick<NhscaDuals2026Registration, "reg_fee_cents" | "apparel_fee_cents">) {
  return (r.reg_fee_cents || 0) + (r.apparel_fee_cents || 0)
}

export function nhscaDualsRegistrationIsPaid(r: Pick<NhscaDuals2026Registration, "status" | "order_id">) {
  return r.status === "paid" || Boolean(r.order_id)
}

export function nhscaDualsTeamShortLabel(eventSlug: string) {
  return eventSlug === "nhsca-duals-2026-select" ? "Select" : "National"
}

export function parentEmailAccountHint(
  parentEmail: string,
  linkedAccountEmail: string | null | undefined
): "same" | "different" | null {
  if (!linkedAccountEmail?.trim()) return null
  return normalizeEmail(linkedAccountEmail) === normalizeEmail(parentEmail) ? "same" : "different"
}
