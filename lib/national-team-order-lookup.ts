import type { SupabaseClient } from "@supabase/supabase-js"
import type { NhscaDuals2026Registration } from "@/lib/nhsca-duals-2026-registrations"
import { resolveNationalTeamOrderTotalCents } from "@/lib/nhsca-hub-checkout-pricing"

const REG_SELECT =
  "id, athlete_first_name, athlete_last_name, event_slug, reg_fee_cents, apparel_fee_cents, singlet_size, shorts_size, shirt_size, checkout_lines, checkout_mode, parent_email, status, order_id, stripe_payment_intent_id, primary_weight, high_school"

type OrderForLookup = {
  id: string
  customer_email?: string | null
  email?: string | null
  customer_name?: string | null
  stripe_payment_intent_id?: string | null
  total?: number | null
}

type RegRow = NhscaDuals2026Registration & {
  order_id?: string | null
  stripe_payment_intent_id?: string | null
}

function athleteFullName(reg: {
  athlete_first_name?: string | null
  athlete_last_name?: string | null
}): string {
  return [reg.athlete_first_name, reg.athlete_last_name].filter(Boolean).join(" ").trim()
}

function namesMatch(
  customerName: string,
  reg: { athlete_first_name?: string | null; athlete_last_name?: string | null },
): boolean {
  const cust = customerName.trim().toLowerCase()
  if (!cust) return true
  const athlete = athleteFullName(reg).toLowerCase()
  if (!athlete) return false
  if (cust === athlete) return true
  const last = (reg.athlete_last_name ?? "").trim().toLowerCase()
  if (last && cust.includes(last)) return true
  const first = (reg.athlete_first_name ?? "").trim().toLowerCase()
  if (first && last && cust.includes(first) && cust.includes(last)) return true
  return false
}

export function isRegistrationStronglyLinkedToOrder(
  order: Pick<OrderForLookup, "id" | "stripe_payment_intent_id">,
  reg: Pick<RegRow, "order_id" | "stripe_payment_intent_id">,
): boolean {
  if (reg.order_id && reg.order_id === order.id) return true
  const orderPi = String(order.stripe_payment_intent_id ?? "").trim()
  const regPi = String(reg.stripe_payment_intent_id ?? "").trim()
  if (orderPi && regPi && orderPi === regPi) return true
  return false
}

export function registrationAmountMatchesOrder(
  order: Pick<OrderForLookup, "total">,
  reg: Pick<RegRow, "checkout_lines" | "reg_fee_cents" | "apparel_fee_cents">,
  toleranceCents = 100,
): boolean {
  const orderCents = Math.round(Number(order.total ?? 0) * 100)
  const regCents = resolveNationalTeamOrderTotalCents({
    checkout_lines: reg.checkout_lines,
    reg_fee_cents: reg.reg_fee_cents,
    apparel_fee_cents: reg.apparel_fee_cents,
  })
  if (regCents <= 0 || orderCents <= 0) return false
  return Math.abs(orderCents - regCents) <= toleranceCents
}

/** Link store orders to hub registration — strict PI/order_id first; fuzzy email only when totals match. */
export async function findNationalTeamRegistrationForOrder(
  supabase: SupabaseClient,
  order: OrderForLookup,
): Promise<NhscaDuals2026Registration | null> {
  const { data: byOrderId } = await supabase
    .from("national_team_event_registrations")
    .select(REG_SELECT)
    .eq("order_id", order.id)
    .maybeSingle()
  if (byOrderId) return byOrderId as NhscaDuals2026Registration

  const orderPi = String(order.stripe_payment_intent_id ?? "").trim()
  if (orderPi) {
    const { data: byPi } = await supabase
      .from("national_team_event_registrations")
      .select(REG_SELECT)
      .eq("stripe_payment_intent_id", orderPi)
      .maybeSingle()
    if (byPi) return byPi as NhscaDuals2026Registration
  }

  const email = (order.customer_email ?? order.email ?? "").trim()
  if (!email) return null

  const { data: rows } = await supabase
    .from("national_team_event_registrations")
    .select(REG_SELECT)
    .eq("status", "paid")
    .ilike("parent_email", email)
    .order("created_at", { ascending: false })
    .limit(12)

  const list = (rows ?? []) as RegRow[]
  if (list.length === 0) return null

  const amountMatches = (reg: RegRow) => registrationAmountMatchesOrder(order, reg)

  const customerName = (order.customer_name ?? "").trim()
  const byName = list.filter((r) => namesMatch(customerName, r) && amountMatches(r))
  if (byName.length >= 1) return byName[0] as NhscaDuals2026Registration

  if (list.length === 1 && amountMatches(list[0])) return list[0] as NhscaDuals2026Registration
  return null
}

export function isNationalTeamEventOrder(order: {
  shipping_method?: unknown
  channel?: string | null
}): boolean {
  const ch = String(order.channel ?? "").toLowerCase()
  if (ch === "national_team" || ch.includes("national")) return true
  try {
    const sm = order.shipping_method
    const label =
      typeof sm === "string"
        ? sm
        : sm && typeof sm === "object" && "name" in sm
          ? String((sm as { name?: string }).name ?? "")
          : ""
    return label.toLowerCase().includes("national team")
  } catch {
    return false
  }
}
