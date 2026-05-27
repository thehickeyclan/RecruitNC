import type { NhscaOrderLineDisplay } from "@/lib/nhsca-hub-checkout-pricing"
import {
  nhscaDualsRegistrationDisplayTotalCents,
  nhscaDualsRegistrationIsPaid,
} from "@/lib/nhsca-duals-2026-registrations"

/** Row shape shared by admin payments + orders report. */
export type NationalTeamFeeReceiptRegistration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  parent_email: string
  reg_fee_cents: number
  apparel_fee_cents: number
  status: string
  order_id: string | null
  created_at: string
  fee_receipt_email_sent_at?: string | null
  line_items?: NhscaOrderLineDisplay[]
}

export function nationalTeamProgramLabel(eventSlug: string) {
  if (eventSlug === "nhsca-duals-2026-select") return "NHSCA Duals 2026 — Select team"
  if (eventSlug === "nhsca-duals-2026") return "NHSCA Duals 2026 — National team"
  return "National Team (NHSCA)"
}

export function nationalTeamReceiptTotalCents(
  r: Pick<NationalTeamFeeReceiptRegistration, "reg_fee_cents" | "apparel_fee_cents"> & {
    line_items?: NhscaOrderLineDisplay[]
  }
): number {
  return nhscaDualsRegistrationDisplayTotalCents(r)
}

export function nationalTeamRegistrationIsPaid(
  r: Pick<NationalTeamFeeReceiptRegistration, "status" | "order_id">
) {
  return nhscaDualsRegistrationIsPaid(r)
}

export function defaultReceiptGreetingName(r: NationalTeamFeeReceiptRegistration): string {
  const parentLocal = (r.parent_email ?? "").split("@")[0]?.replace(/[._0-9]+/g, " ").trim()
  if (parentLocal && parentLocal.length >= 2) {
    const first = parentLocal.split(/\s+/)[0] ?? ""
    if (first.length >= 2) return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  }
  return (r.athlete_first_name ?? "").trim() || "Friend"
}

export function dateToInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function localDateToNoonIso(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  if (!y || !m || !d) return new Date().toISOString()
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

export function parseDollarsToCents(s: string): number | null {
  const n = Number.parseFloat(s.replace(/[$,]/g, ""))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export function formatCentsDollars(cents: number) {
  return (cents / 100).toFixed(2)
}
