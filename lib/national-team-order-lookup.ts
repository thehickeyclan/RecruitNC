import type { SupabaseClient } from "@supabase/supabase-js"
import type { NhscaDuals2026Registration } from "@/lib/nhsca-duals-2026-registrations"

const REG_SELECT =
  "id, athlete_first_name, athlete_last_name, event_slug, reg_fee_cents, apparel_fee_cents, singlet_size, shorts_size, shirt_size, checkout_lines, checkout_mode, parent_email, status, order_id, primary_weight, high_school"

function athleteFullName(reg: {
  athlete_first_name?: string | null
  athlete_last_name?: string | null
}): string {
  return [reg.athlete_first_name, reg.athlete_last_name].filter(Boolean).join(" ").trim()
}

function namesMatch(customerName: string, reg: { athlete_first_name?: string | null; athlete_last_name?: string | null }): boolean {
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

/** Link store orders to hub registration (order_id, parent email + athlete name). */
export async function findNationalTeamRegistrationForOrder(
  supabase: SupabaseClient,
  order: {
    id: string
    customer_email?: string | null
    email?: string | null
    customer_name?: string | null
  },
): Promise<NhscaDuals2026Registration | null> {
  const { data: byOrderId } = await supabase
    .from("national_team_event_registrations")
    .select(REG_SELECT)
    .eq("order_id", order.id)
    .maybeSingle()
  if (byOrderId) return byOrderId as NhscaDuals2026Registration

  const email = (order.customer_email ?? order.email ?? "").trim()
  if (!email) return null

  const { data: rows } = await supabase
    .from("national_team_event_registrations")
    .select(REG_SELECT)
    .eq("status", "paid")
    .ilike("parent_email", email)
    .order("created_at", { ascending: false })
    .limit(12)

  const list = (rows ?? []) as NhscaDuals2026Registration[]
  if (list.length === 0) return null

  const customerName = (order.customer_name ?? "").trim()
  const byName = list.filter((r) => namesMatch(customerName, r))
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) return byName[0]

  if (list.length === 1) return list[0]
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
