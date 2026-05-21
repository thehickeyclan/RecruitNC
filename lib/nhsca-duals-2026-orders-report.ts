import type { NhscaOrderLineDisplay } from "@/lib/nhsca-hub-checkout-pricing"
import {
  nhscaDualsRegistrationIsPaid,
  nhscaDualsRegistrationTotalCents,
  nhscaDualsTeamShortLabel,
  type NhscaDuals2026Registration,
} from "@/lib/nhsca-duals-2026-registrations"

export type NhscaOrderIncludesFilter =
  | "all"
  | "team_package"
  | "registration"
  | "van"
  | "hotel"
  | "gear"

export type NhscaOrdersReportRow = NhscaDuals2026Registration & {
  order_summary?: string
  line_items?: NhscaOrderLineDisplay[]
  total_cents: number
  team: string
  is_paid: boolean
  athlete_name: string
}

export function toOrdersReportRow(r: NhscaDuals2026Registration & {
  order_summary?: string
  line_items?: NhscaOrderLineDisplay[]
}): NhscaOrdersReportRow {
  return {
    ...r,
    total_cents: nhscaDualsRegistrationTotalCents(r),
    team: nhscaDualsTeamShortLabel(r.event_slug),
    is_paid: nhscaDualsRegistrationIsPaid(r),
    athlete_name: `${r.athlete_first_name ?? ""} ${r.athlete_last_name ?? ""}`.trim() || "—",
  }
}

function lineText(items: NhscaOrderLineDisplay[] | undefined): string {
  return (items ?? []).map((i) => i.name.toLowerCase()).join(" ")
}

export function rowIncludesCategory(row: NhscaOrdersReportRow, filter: NhscaOrderIncludesFilter): boolean {
  if (filter === "all") return true
  const text = lineText(row.line_items)
  const checkout = (row.checkout_lines ?? "").toLowerCase()
  const combined = `${text} ${checkout}`

  switch (filter) {
    case "team_package":
      return /team package|team_package/.test(combined)
    case "registration":
      return /registration|team fee|team_package/.test(combined)
    case "van":
      return /van|van_travel/.test(combined)
    case "hotel":
      return /hotel/.test(combined)
    case "gear":
      return /singlet|shorts|tee|long sleeve|short sleeve|apparel/.test(combined)
    default:
      return true
  }
}

export function formatLineItemsForCell(items: NhscaOrderLineDisplay[] | undefined): string {
  if (!items?.length) return "—"
  return items.map((i) => `${i.name} ($${(i.amount_cents / 100).toFixed(2)})`).join("; ")
}

export function reportSummary(rows: NhscaOrdersReportRow[]) {
  const paid = rows.filter((r) => r.is_paid)
  const pending = rows.filter((r) => !r.is_paid)
  const paidTotal = paid.reduce((s, r) => s + r.total_cents, 0)
  const national = paid.filter((r) => r.team === "National")
  const select = paid.filter((r) => r.team === "Select")
  return {
    totalRows: rows.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    paidTotalCents: paidTotal,
    nationalPaidCount: national.length,
    selectPaidCount: select.length,
    withVan: paid.filter((r) => rowIncludesCategory(r, "van")).length,
    withHotel: paid.filter((r) => rowIncludesCategory(r, "hotel")).length,
    withTeamPackage: paid.filter((r) => rowIncludesCategory(r, "team_package")).length,
    withGear: paid.filter((r) => rowIncludesCategory(r, "gear")).length,
  }
}

export function ordersReportToCsv(rows: NhscaOrdersReportRow[]): string {
  const headers = [
    "Athlete",
    "Team",
    "Parent email",
    "Status",
    "Total",
    "What they ordered",
    "Singlet size",
    "Shorts size",
    "Shirt size",
    "Order number",
    "Paid / created",
  ]
  const escape = (v: string) => {
    const s = String(v ?? "")
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = rows.map((r) =>
    [
      r.athlete_name,
      r.team,
      r.parent_email,
      r.is_paid ? "Paid" : "Pending",
      (r.total_cents / 100).toFixed(2),
      formatLineItemsForCell(r.line_items),
      r.singlet_size ?? "",
      r.shorts_size ?? "",
      r.shirt_size ?? "",
      r.order_number ?? "",
      r.updated_at ?? r.created_at,
    ]
      .map(escape)
      .join(",")
  )
  return [headers.join(","), ...lines].join("\n")
}
