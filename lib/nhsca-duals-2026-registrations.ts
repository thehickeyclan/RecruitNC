import type { SupabaseClient } from "@supabase/supabase-js"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import {
  resolveRegistrationOrderLines,
  resolveRegistrationOrderSummary,
  type NhscaOrderLineDisplay,
} from "@/lib/nhsca-hub-checkout-pricing"

/** NHSCA Duals 2026 — National & Select event slugs. */
export const NHSCA_DUALS_2026_EVENT_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"] as const

/** All events surfaced on admin national-team payments + family order history. */
export const NATIONAL_TEAM_PAYMENTS_EVENT_SLUGS = [
  ...NHSCA_DUALS_2026_EVENT_SLUGS,
  AAU_SCHOLASTIC_EVENT_SLUG,
] as const

export { AAU_SCHOLASTIC_EVENT_SLUG }

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
  order_number?: string | null
  record?: string | null
  created_at: string
  updated_at?: string | null
  shirt_size?: string | null
  singlet_size?: string | null
  shorts_size?: string | null
  checkout_lines?: string | null
  checkout_mode?: string | null
  fee_receipt_email_sent_at?: string | null
  order_line_items?: {
    product_name?: string | null
    quantity?: number | null
    price?: number | null
    subtotal?: number | null
  }[]
}

/** Hub Payment → Orders tab (paid only). */
export type NhscaDuals2026PaidOrderRow = {
  id: string
  athlete: string
  parent_email: string
  weight: string
  amount_cents: number
  /** Stripe order number when available. */
  code: string
  team: string
  items: string
  line_items: NhscaOrderLineDisplay[]
  paid_at: string
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

async function attachOrderNumbers(
  admin: SupabaseClient,
  registrations: NhscaDuals2026Registration[]
): Promise<void> {
  const orderIds = [...new Set(registrations.map((r) => r.order_id).filter(Boolean))] as string[]
  if (orderIds.length === 0) return
  const { data: orders } = await admin.from("orders").select("id, order_number").in("id", orderIds)
  const byId = new Map<string, string>()
  for (const o of orders ?? []) {
    const row = o as { id: string; order_number?: string | null }
    if (row.order_number?.trim()) byId.set(row.id, row.order_number.trim())
  }
  for (const r of registrations) {
    r.order_number = r.order_id ? byId.get(r.order_id) ?? null : null
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

  const selectColsWithCheckout =
    "id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, parent_user_id, high_school, graduation_year, primary_weight, reg_fee_cents, apparel_fee_cents, status, order_id, record, created_at, shirt_size, singlet_size, shorts_size, checkout_lines, checkout_mode, updated_at"
  const selectColsBase =
    "id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, parent_user_id, high_school, graduation_year, primary_weight, reg_fee_cents, apparel_fee_cents, status, order_id, record, created_at, shirt_size, singlet_size, shorts_size, updated_at"

  let selectCols = selectColsWithCheckout

  let rows: NhscaDuals2026Registration[] = []

  const loadRows = async (cols: string) => {
    if (opts.isAdmin) {
      const { data, error } = await admin
        .from("national_team_event_registrations")
        .select(cols)
        .in("event_slug", eventSlugs)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as NhscaDuals2026Registration[]
    }

    const viewerEmail = normalizeEmail(opts.viewerEmail)
    const viewerUserId = opts.viewerUserId?.trim() || null
    const byId = new Map<string, NhscaDuals2026Registration>()

    if (viewerUserId) {
      const { data, error } = await admin
        .from("national_team_event_registrations")
        .select(cols)
        .in("event_slug", eventSlugs)
        .eq("parent_user_id", viewerUserId)
        .order("created_at", { ascending: false })
      if (error) throw error
      for (const r of (data ?? []) as NhscaDuals2026Registration[]) byId.set(r.id, r)
    }

    if (viewerEmail) {
      const { data, error } = await admin
        .from("national_team_event_registrations")
        .select(cols)
        .in("event_slug", eventSlugs)
        .ilike("parent_email", viewerEmail)
        .order("created_at", { ascending: false })
      if (error) throw error
      for (const r of (data ?? []) as NhscaDuals2026Registration[]) byId.set(r.id, r)
    }

    return [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  try {
    rows = await loadRows(selectCols)
  } catch (error) {
    const code = (error as { code?: string })?.code
    const msg = ((error as { message?: string })?.message ?? "").toLowerCase()
    if (code === "42703" || (msg.includes("column") && msg.includes("checkout"))) {
      selectCols = selectColsBase
      rows = await loadRows(selectCols)
    } else {
      throw error
    }
  }

  await enrichLinkedAccountEmails(admin, rows)
  await attachOrderNumbers(admin, rows)
  await attachOrderLineItems(admin, rows)
  await attachReceiptSentAt(admin, rows)
  return rows
}

async function attachOrderLineItems(
  admin: SupabaseClient,
  registrations: NhscaDuals2026Registration[]
): Promise<void> {
  const orderIds = [...new Set(registrations.map((r) => r.order_id).filter(Boolean))] as string[]
  if (orderIds.length === 0) return

  const { data, error } = await admin
    .from("order_items")
    .select("order_id, product_name, quantity, price, subtotal")
    .in("order_id", orderIds)

  if (error) {
    console.warn("[nhsca-duals-2026-registrations] order_items load:", error.message)
    return
  }

  const byOrderId = new Map<string, NonNullable<NhscaDuals2026Registration["order_line_items"]>>()
  for (const row of data ?? []) {
    const item = row as {
      order_id: string
      product_name?: string | null
      quantity?: number | null
      price?: number | null
      subtotal?: number | null
    }
    const list = byOrderId.get(item.order_id) ?? []
    list.push({
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })
    byOrderId.set(item.order_id, list)
  }

  for (const r of registrations) {
    r.order_line_items = r.order_id ? byOrderId.get(r.order_id) ?? [] : []
  }
}

/** Paid NHSCA Duals orders for hub Past orders — athlete, parent, weight, amount, code only. */
export async function listNhscaDuals2026PaidOrders(
  admin: SupabaseClient,
  opts: {
    isAdmin: boolean
    viewerUserId?: string | null
    viewerEmail?: string | null
    eventSlug?: string | null
    eventSlugs?: readonly string[]
  }
): Promise<NhscaDuals2026PaidOrderRow[]> {
  const all = await listNhscaDuals2026Registrations(admin, opts)
  return all
    .filter((r) => nhscaDualsRegistrationIsPaid(r))
    .map((r) => toPaidOrderRow(r))
}

export function nhscaDualsOrderCode(r: Pick<NhscaDuals2026Registration, "order_number" | "event_slug">): string {
  if (r.order_number?.trim()) return r.order_number.trim()
  return nationalTeamEventShortLabel(r.event_slug)
}

function toPaidOrderRow(r: NhscaDuals2026Registration): NhscaDuals2026PaidOrderRow {
  const lineItems = resolveRegistrationOrderLines(r)
  return {
    id: r.id,
    athlete: `${r.athlete_first_name} ${r.athlete_last_name}`.trim(),
    parent_email: r.parent_email,
    weight: r.primary_weight,
    amount_cents: nhscaDualsRegistrationTotalCents(r),
    code: nhscaDualsOrderCode(r),
    team: nationalTeamEventShortLabel(r.event_slug),
    items: resolveRegistrationOrderSummary(r),
    line_items: lineItems,
    paid_at: r.updated_at ?? r.created_at,
  }
}

export function nhscaDualsRegistrationOrderSummary(r: NhscaDuals2026Registration): string {
  return resolveRegistrationOrderSummary(r)
}

export function nhscaDualsRegistrationOrderLines(r: NhscaDuals2026Registration): NhscaOrderLineDisplay[] {
  return resolveRegistrationOrderLines(r)
}

export function nhscaDualsRegistrationTotalCents(r: Pick<NhscaDuals2026Registration, "reg_fee_cents" | "apparel_fee_cents">) {
  return (r.reg_fee_cents || 0) + (r.apparel_fee_cents || 0)
}

/** Prefer line-item total when hub checkout stored fees differently than Stripe. */
export function nhscaDualsRegistrationDisplayTotalCents(
  r: Pick<NhscaDuals2026Registration, "reg_fee_cents" | "apparel_fee_cents"> & {
    line_items?: NhscaOrderLineDisplay[]
  }
): number {
  const fromFees = nhscaDualsRegistrationTotalCents(r)
  const fromLines = (r.line_items ?? []).reduce((sum, item) => sum + (item.amount_cents || 0), 0)
  if (fromLines > 0) return Math.max(fromFees, fromLines)
  return fromFees
}

export function nhscaDualsRegistrationIsPaid(r: Pick<NhscaDuals2026Registration, "status" | "order_id">) {
  return r.status === "paid" || Boolean(r.order_id)
}

export function nationalTeamEventShortLabel(eventSlug: string) {
  if (eventSlug === "nhsca-duals-2026-select") return "Select"
  if (eventSlug === AAU_SCHOLASTIC_EVENT_SLUG) return "AAU Scholastic"
  if (eventSlug === "nhsca-duals-2026") return "National"
  return eventSlug.replace(/-/g, " ")
}

/** @deprecated Use {@link nationalTeamEventShortLabel} */
export function nhscaDualsTeamShortLabel(eventSlug: string) {
  return nationalTeamEventShortLabel(eventSlug)
}

export function parentEmailAccountHint(
  parentEmail: string,
  linkedAccountEmail: string | null | undefined
): "same" | "different" | null {
  if (!linkedAccountEmail?.trim()) return null
  return normalizeEmail(linkedAccountEmail) === normalizeEmail(parentEmail) ? "same" : "different"
}
