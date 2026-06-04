import {
  AAU_SCHOLASTIC_DUALS_2026_ROSTER,
  type AauScholasticRosterRow,
} from "@/lib/aau-scholastic-duals-2026-roster"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import { normalizePersonName } from "@/lib/aau-scholastic-registration-resolve"
import {
  nhscaDualsRegistrationIsPaid,
  type NhscaDuals2026Registration,
} from "@/lib/nhsca-duals-2026-registrations"
import { resolveRegistrationOrderLines } from "@/lib/nhsca-hub-checkout-pricing"
import { inferNationalTeamLineKey, nationalTeamLineCategory } from "@/lib/national-team-product-catalog"
import { rosterWrestlerKeyForRegistration } from "@/lib/aau-scholastic-roster-registration-status"

export type AauRosterPaymentAmounts = {
  tournament_reg_cents: number
  apparel_cents: number
  flight_cents: number
  hotel_cents: number
  total_cents: number
  is_paid: boolean
  parent_email: string | null
  registration_ids: string[]
}

export type AauRosterPaymentMatrixRow = AauScholasticRosterRow & {
  wrestlerKey: string
  payments: AauRosterPaymentAmounts | null
}

export type AauRosterPaymentExtraRow = {
  wrestlerKey: string
  athlete_name: string
  primary_weight: string
  payments: AauRosterPaymentAmounts
}

export type AauRosterPaymentMatrixSummary = {
  rosterSlots: number
  filledSlots: number
  paidOnRoster: number
  unpaidOnRoster: number
  extrasCount: number
  columnTotals: Omit<AauRosterPaymentAmounts, "is_paid" | "parent_email" | "registration_ids">
}

export type AauRosterPaymentMatrix = {
  roster: AauRosterPaymentMatrixRow[]
  extras: AauRosterPaymentExtraRow[]
  summary: AauRosterPaymentMatrixSummary
}

type PaymentColumn = keyof Pick<
  AauRosterPaymentAmounts,
  "tournament_reg_cents" | "apparel_cents" | "flight_cents" | "hotel_cents"
>

export function emptyAauRosterPaymentAmounts(): AauRosterPaymentAmounts {
  return {
    tournament_reg_cents: 0,
    apparel_cents: 0,
    flight_cents: 0,
    hotel_cents: 0,
    total_cents: 0,
    is_paid: false,
    parent_email: null,
    registration_ids: [],
  }
}

export function aauLineToPaymentColumn(key: string | undefined | null, name: string): PaymentColumn | null {
  const resolvedKey =
    (key ?? "").trim() || inferNationalTeamLineKey(AAU_SCHOLASTIC_EVENT_SLUG, name) || ""
  if (resolvedKey) {
    switch (resolvedKey) {
      case "tournament_reg":
        return "tournament_reg_cents"
      case "singlet":
      case "long_sleeve":
      case "shorts":
      case "tee":
        return "apparel_cents"
      case "flight":
        return "flight_cents"
      case "hotel_van":
        return "hotel_cents"
      default:
        break
    }
  }

  const category = nationalTeamLineCategory(AAU_SCHOLASTIC_EVENT_SLUG, { key: resolvedKey || null, name })
  if (category === "registration") return "tournament_reg_cents"
  if (category === "apparel") return "apparel_cents"

  const lower = name.toLowerCase()
  if (/flight/.test(lower)) return "flight_cents"
  if (/hotel|van/.test(lower)) return "hotel_cents"
  return null
}

export function paymentAmountsFromRegistration(
  reg: Pick<
    NhscaDuals2026Registration,
    | "event_slug"
    | "reg_fee_cents"
    | "apparel_fee_cents"
    | "checkout_lines"
    | "order_line_items"
    | "singlet_size"
    | "shorts_size"
    | "shirt_size"
  >,
): Pick<AauRosterPaymentAmounts, "tournament_reg_cents" | "apparel_cents" | "flight_cents" | "hotel_cents"> {
  const out = {
    tournament_reg_cents: 0,
    apparel_cents: 0,
    flight_cents: 0,
    hotel_cents: 0,
  }
  for (const line of resolveRegistrationOrderLines(reg)) {
    const column = aauLineToPaymentColumn(line.key, line.name)
    if (column) out[column] += line.amount_cents || 0
  }
  return out
}

function totalFromCells(
  cells: Pick<AauRosterPaymentAmounts, "tournament_reg_cents" | "apparel_cents" | "flight_cents" | "hotel_cents">,
): number {
  return cells.tournament_reg_cents + cells.apparel_cents + cells.flight_cents + cells.hotel_cents
}

function mergePaymentAmounts(a: AauRosterPaymentAmounts, b: AauRosterPaymentAmounts): AauRosterPaymentAmounts {
  return {
    tournament_reg_cents: a.tournament_reg_cents + b.tournament_reg_cents,
    apparel_cents: a.apparel_cents + b.apparel_cents,
    flight_cents: a.flight_cents + b.flight_cents,
    hotel_cents: a.hotel_cents + b.hotel_cents,
    total_cents: a.total_cents + b.total_cents,
    is_paid: a.is_paid || b.is_paid,
    parent_email: a.parent_email || b.parent_email,
    registration_ids: [...a.registration_ids, ...b.registration_ids],
  }
}

function registrationToPaymentAmounts(reg: NhscaDuals2026Registration): AauRosterPaymentAmounts {
  const cells = paymentAmountsFromRegistration(reg)
  const total = totalFromCells(cells)
  return {
    ...cells,
    total_cents: total,
    is_paid: nhscaDualsRegistrationIsPaid(reg),
    parent_email: reg.parent_email?.trim() || null,
    registration_ids: [reg.id],
  }
}

export function buildAauScholasticRosterPaymentMatrix(
  registrations: NhscaDuals2026Registration[],
): AauRosterPaymentMatrix {
  const byWrestlerKey = new Map<string, AauRosterPaymentAmounts>()
  const rosterKeys = new Set<string>()

  for (const row of AAU_SCHOLASTIC_DUALS_2026_ROSTER) {
    if (row.openSlot || !row.wrestler.trim()) continue
    rosterKeys.add(normalizePersonName(row.wrestler))
  }

  for (const reg of registrations) {
    if (reg.event_slug !== AAU_SCHOLASTIC_EVENT_SLUG) continue
    if (!nhscaDualsRegistrationIsPaid(reg)) continue

    const wrestlerKey = rosterWrestlerKeyForRegistration(reg)
    if (!wrestlerKey) continue

    const next = registrationToPaymentAmounts(reg)
    if (next.total_cents <= 0) continue

    const existing = byWrestlerKey.get(wrestlerKey)
    byWrestlerKey.set(wrestlerKey, existing ? mergePaymentAmounts(existing, next) : next)
  }

  const roster: AauRosterPaymentMatrixRow[] = AAU_SCHOLASTIC_DUALS_2026_ROSTER.map((row) => {
    const wrestlerKey = row.wrestler.trim() ? normalizePersonName(row.wrestler) : ""
    const payments = wrestlerKey ? byWrestlerKey.get(wrestlerKey) ?? null : null
    return { ...row, wrestlerKey, payments }
  })

  const extras: AauRosterPaymentExtraRow[] = []
  for (const [wrestlerKey, payments] of byWrestlerKey) {
    if (rosterKeys.has(wrestlerKey)) continue
    const reg = registrations.find(
      (r) =>
        r.event_slug === AAU_SCHOLASTIC_EVENT_SLUG &&
        nhscaDualsRegistrationIsPaid(r) &&
        rosterWrestlerKeyForRegistration(r) === wrestlerKey,
    )
    extras.push({
      wrestlerKey,
      athlete_name: reg
        ? `${reg.athlete_first_name} ${reg.athlete_last_name}`.trim()
        : wrestlerKey,
      primary_weight: reg?.primary_weight ?? "",
      payments,
    })
  }
  extras.sort((a, b) => a.athlete_name.localeCompare(b.athlete_name))

  const filledSlots = roster.filter((r) => r.wrestler.trim() && !r.openSlot).length
  const paidOnRoster = roster.filter((r) => r.payments?.is_paid && (r.payments.total_cents ?? 0) > 0).length
  const unpaidOnRoster = filledSlots - paidOnRoster

  const columnTotals = {
    tournament_reg_cents: 0,
    apparel_cents: 0,
    flight_cents: 0,
    hotel_cents: 0,
    total_cents: 0,
  }
  for (const payments of byWrestlerKey.values()) {
    columnTotals.tournament_reg_cents += payments.tournament_reg_cents
    columnTotals.apparel_cents += payments.apparel_cents
    columnTotals.flight_cents += payments.flight_cents
    columnTotals.hotel_cents += payments.hotel_cents
    columnTotals.total_cents += payments.total_cents
  }

  return {
    roster,
    extras,
    summary: {
      rosterSlots: roster.length,
      filledSlots,
      paidOnRoster,
      unpaidOnRoster,
      extrasCount: extras.length,
      columnTotals,
    },
  }
}

export function formatAauPaymentCell(cents: number | undefined | null): string {
  if (!cents || cents <= 0) return "—"
  return `$${(cents / 100).toFixed(2)}`
}

export function aauRosterPaymentMatrixToCsv(matrix: AauRosterPaymentMatrix): string {
  const headers = [
    "Weight",
    "Wrestler",
    "Tournament reg",
    "Apparel",
    "Flight",
    "Hotel",
    "Total",
    "Parent email",
  ]
  const escape = (v: string) => {
    const s = String(v ?? "")
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const rosterLines = matrix.roster
    .filter((r) => r.wrestler.trim() || r.openSlot)
    .map((r) => {
      const p = r.payments
      return [
        r.weightLabel,
        r.wrestler.trim() || "Open — TBD",
        p ? (p.tournament_reg_cents / 100).toFixed(2) : "",
        p ? (p.apparel_cents / 100).toFixed(2) : "",
        p ? (p.flight_cents / 100).toFixed(2) : "",
        p ? (p.hotel_cents / 100).toFixed(2) : "",
        p ? (p.total_cents / 100).toFixed(2) : "",
        p?.parent_email ?? "",
      ]
        .map(escape)
        .join(",")
    })

  const extraLines = matrix.extras.map((r) =>
    [
      r.primary_weight || "—",
      r.athlete_name,
      (r.payments.tournament_reg_cents / 100).toFixed(2),
      (r.payments.apparel_cents / 100).toFixed(2),
      (r.payments.flight_cents / 100).toFixed(2),
      (r.payments.hotel_cents / 100).toFixed(2),
      (r.payments.total_cents / 100).toFixed(2),
      r.payments.parent_email ?? "",
    ]
      .map(escape)
      .join(","),
  )

  return [headers.join(","), ...rosterLines, ...extraLines].join("\n")
}
