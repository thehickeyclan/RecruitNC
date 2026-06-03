import { parseCsvLine } from "@/lib/nhsca-roster-tsv-parse"
import { scoreAthleteNameMatch } from "@/lib/data-dawg-agent-v2/fuzzy-utils"

export type WiqSubscriptionStatus = "active" | "past_due" | "grace" | "cancelled"

export type ParsedWiqCsvRow = {
  wiqBillingPartnerId: string
  billedTo: string
  wrestlerName: string
  wiqStatusRaw: string
  status: WiqSubscriptionStatus
  memberSince: string | null
  nextDueAt: string | null
  activeUntil: string | null
  amountCents: number
  amountDisplay: string
  billingInterval: string
  membershipType: string
  productLabel: string
  discountCode: string | null
}

export type AthleteMatchCandidate = {
  id: string
  name: string
  highSchool: string | null
  gradYear: number | null
  score: number
}

export type WiqImportPreviewRow = ParsedWiqCsvRow & {
  athleteId: string | null
  athleteName: string | null
  matchConfidence: "exact" | "fuzzy" | "manual" | "unmatched"
  duplicateWrestler: boolean
  action: "upsert" | "skip_non_blue"
}

export type WiqImportPreview = {
  reportDate: string | null
  totalRows: number
  blueRows: number
  skippedNonBlue: number
  activeCount: number
  pastDueCount: number
  graceCount: number
  cancelledCount: number
  duplicateWrestlerNames: string[]
  rows: WiqImportPreviewRow[]
  /** WIQ ids currently active in DB but absent from this CSV (after apply). */
  wouldFlagMissing: string[]
}

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase()
}

/** Parse WIQ date strings like `3/23/2026 12:45 pm` or ` 6/15/2026 07:33 pm`. */
export function parseWiqDate(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim()
  if (!s || s.toLowerCase() === "unknown") return null
  const activeUntil = s.match(/^Active until\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)
  const datePart = activeUntil ? activeUntil[1] : s.split(/\s+/).slice(0, 1)[0]
  if (!datePart || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) return null
  const [mo, da, yr] = datePart.split("/").map((x) => parseInt(x, 10))
  if (!mo || !da || !yr) return null
  const d = new Date(yr, mo - 1, da, 12, 0, 0, 0)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function parseWiqAmountCents(raw: string | null | undefined): number {
  const s = String(raw ?? "").replace(/[^0-9.]/g, "")
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function isWiqBlueProduct(items: string): boolean {
  return items.replace(/"/g, "").trim().toLowerCase().includes("nc united blue")
}

export function mapWiqStatus(
  wiqStatus: string,
  nextDueRaw: string,
  referenceDate: Date = new Date(),
): { status: WiqSubscriptionStatus; nextDueAt: string | null; activeUntil: string | null } {
  const statusNorm = wiqStatus.trim().toLowerCase()
  const nextDueTrim = String(nextDueRaw ?? "").trim()
  const activeUntilMatch = nextDueTrim.match(/^Active until\s+(.+)$/i)
  const activeUntil = activeUntilMatch ? parseWiqDate(activeUntilMatch[0]) : null

  if (statusNorm === "paid") {
    const nextDueAt = parseWiqDate(nextDueTrim)
    return { status: "active", nextDueAt, activeUntil: null }
  }
  if (statusNorm === "overdue") {
    return { status: "past_due", nextDueAt: null, activeUntil: null }
  }
  if (statusNorm === "canceled" || statusNorm === "cancelled") {
    if (activeUntil) {
      const end = new Date(activeUntil)
      if (end >= referenceDate) {
        return { status: "grace", nextDueAt: null, activeUntil }
      }
    }
    return { status: "cancelled", nextDueAt: null, activeUntil }
  }
  return { status: "cancelled", nextDueAt: parseWiqDate(nextDueTrim), activeUntil }
}

function parseCsvRows(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim())
  return lines.map((line) => parseCsvLine(line))
}

export function parseWiqMembershipCsv(csvText: string, referenceDate?: Date): ParsedWiqCsvRow[] {
  const grid = parseCsvRows(csvText)
  if (grid.length < 2) return []

  const header = grid[0].map(normalizeHeader)
  const col = (name: string) => header.indexOf(name)

  const iBilled = col("billed to")
  const iWrestler = col("wrestler names")
  const iStatus = col("status")
  const iSince = col("member since")
  const iNext = col("next due")
  const iTotal = col("total")
  const iInterval = col("billing interval")
  const iType = col("membership type")
  const iItems = col("items")
  const iDiscount = col("discount")
  const iPartner = col("billing partner id")

  if ([iWrestler, iStatus, iItems, iPartner].some((i) => i < 0)) {
    throw new Error("CSV missing required columns (Wrestler names, Status, Items, Billing partner id)")
  }

  const out: ParsedWiqCsvRow[] = []
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]
    const productLabel = (cells[iItems] ?? "").replace(/"/g, "").trim()
    if (!isWiqBlueProduct(productLabel)) continue

    const wiqId = (cells[iPartner] ?? "").trim()
    if (!wiqId) continue

    const wiqStatusRaw = (cells[iStatus] ?? "").trim()
    const mapped = mapWiqStatus(wiqStatusRaw, cells[iNext] ?? "", referenceDate)
    const amountDisplay = (cells[iTotal] ?? "").trim()

    out.push({
      wiqBillingPartnerId: wiqId,
      billedTo: iBilled >= 0 ? (cells[iBilled] ?? "").trim() : "",
      wrestlerName: (cells[iWrestler] ?? "").trim(),
      wiqStatusRaw,
      status: mapped.status,
      memberSince: parseWiqDate(cells[iSince] ?? ""),
      nextDueAt: mapped.nextDueAt,
      activeUntil: mapped.activeUntil,
      amountCents: parseWiqAmountCents(amountDisplay),
      amountDisplay,
      billingInterval: iInterval >= 0 ? (cells[iInterval] ?? "").trim() : "",
      membershipType: iType >= 0 ? (cells[iType] ?? "").trim() : "",
      productLabel,
      discountCode: iDiscount >= 0 ? (cells[iDiscount] ?? "").trim() || null : null,
    })
  }
  return out
}

export type AthleteForWiqMatch = {
  id: string
  name: string
  firstName: string
  lastName: string
  highSchool: string | null
  gradYear: number | null
}

export function matchAthleteForWiqName(
  wrestlerName: string,
  athletes: AthleteForWiqMatch[],
  existingAthleteId?: string | null,
): { athleteId: string | null; athleteName: string | null; matchConfidence: WiqImportPreviewRow["matchConfidence"] } {
  if (existingAthleteId) {
    const kept = athletes.find((a) => a.id === existingAthleteId)
    if (kept) {
      return { athleteId: kept.id, athleteName: kept.name, matchConfidence: "manual" }
    }
  }

  const q = wrestlerName.trim().toLowerCase()
  if (!q) return { athleteId: null, athleteName: null, matchConfidence: "unmatched" }

  let best: { id: string; name: string; score: number } | null = null
  for (const a of athletes) {
    const score = scoreAthleteNameMatch(q, a.firstName, a.lastName, a.name)
    if (!best || score > best.score) {
      best = { id: a.id, name: a.name, score }
    }
  }

  if (!best) return { athleteId: null, athleteName: null, matchConfidence: "unmatched" }
  if (best.score >= 0.98) {
    return { athleteId: best.id, athleteName: best.name, matchConfidence: "exact" }
  }
  if (best.score >= 0.82) {
    return { athleteId: best.id, athleteName: best.name, matchConfidence: "fuzzy" }
  }
  return { athleteId: null, athleteName: null, matchConfidence: "unmatched" }
}

export function buildWiqImportPreview(
  csvText: string,
  athletes: AthleteForWiqMatch[],
  existingByWiqId: Map<string, { athlete_id: string | null }>,
  previouslyActiveWiqIds: string[],
  referenceDate?: Date,
): WiqImportPreview {
  const parsed = parseWiqMembershipCsv(csvText, referenceDate)
  const totalRows = parseCsvRows(csvText).length - 1
  const blueIds = new Set(parsed.map((r) => r.wiqBillingPartnerId))

  const wrestlerCounts = new Map<string, number>()
  for (const r of parsed) {
    const k = r.wrestlerName.toLowerCase()
    wrestlerCounts.set(k, (wrestlerCounts.get(k) ?? 0) + 1)
  }
  const duplicateWrestlerNames = [...wrestlerCounts.entries()]
    .filter(([, c]) => c > 1)
    .map(([n]) => n)

  const rows: WiqImportPreviewRow[] = parsed.map((r) => {
    const existing = existingByWiqId.get(r.wiqBillingPartnerId)
    const match = matchAthleteForWiqName(r.wrestlerName, athletes, existing?.athlete_id)
    return {
      ...r,
      athleteId: match.athleteId,
      athleteName: match.athleteName,
      matchConfidence: match.matchConfidence,
      duplicateWrestler: (wrestlerCounts.get(r.wrestlerName.toLowerCase()) ?? 0) > 1,
      action: "upsert",
    }
  })

  const wouldFlagMissing = previouslyActiveWiqIds.filter((id) => !blueIds.has(id))

  return {
    reportDate: referenceDate?.toISOString() ?? new Date().toISOString(),
    totalRows,
    blueRows: parsed.length,
    skippedNonBlue: Math.max(0, totalRows - parsed.length),
    activeCount: parsed.filter((r) => r.status === "active").length,
    pastDueCount: parsed.filter((r) => r.status === "past_due").length,
    graceCount: parsed.filter((r) => r.status === "grace").length,
    cancelledCount: parsed.filter((r) => r.status === "cancelled").length,
    duplicateWrestlerNames,
    rows,
    wouldFlagMissing,
  }
}

export function isWiqBillableStatus(status: WiqSubscriptionStatus): boolean {
  return status === "active" || status === "past_due" || status === "grace"
}
