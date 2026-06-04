import { parseCsvLine } from "@/lib/nhsca-roster-tsv-parse"
import { scoreAthleteNameMatch } from "@/lib/data-dawg-agent-v2/fuzzy-utils"

export type WiqSubscriptionStatus = "active" | "past_due" | "grace" | "cancelled" | "paused"

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
  pausedCount: number
  duplicateWrestlerNames: string[]
  rows: WiqImportPreviewRow[]
  /** WIQ ids currently active in DB but absent from this CSV (after apply). */
  wouldFlagMissing: string[]
  /** Rows marked paused via Currently Paused Subscription Report overlay. */
  pausedApplied?: number
  /** Parsed row count from Active Renewing Members report (allowlist). */
  activeRenewingListCount?: number
  /** Paid rows demoted to paused — not on Active Renewing allowlist (legacy; always 0). */
  demotedFromActive?: number
  /** Paid rows matched to Active Renewing allowlist (informational). */
  activeRenewingMatched?: number
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

  if (statusNorm === "paused" || statusNorm === "pause") {
    const resumeAt = parseWiqDate(nextDueTrim)
    return { status: "paused", nextDueAt: resumeAt, activeUntil: null }
  }
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

export type ParsedWiqPausedRow = {
  wrestlerName: string
  billedTo: string
  pausedAt: string | null
  resumeAt: string | null
  planLabel: string | null
}

function normalizePersonName(name: string): string {
  let s = name
    .trim()
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
  s = s.replace(/\s+family$/, "")
  // "Joshua S. Stonebraker" → "joshua stonebraker" for allowlist / paused matching
  s = s.replace(/\s+[a-z]\.?(?=\s|$)/g, " ").replace(/\s+/g, " ").trim()
  return s
}

function pauseMatchKey(wrestlerName: string, billedTo: string): string {
  return `${normalizePersonName(wrestlerName)}|${normalizePersonName(billedTo)}`
}

function findHeaderIndex(header: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = header.indexOf(c)
    if (i >= 0) return i
  }
  for (let i = 0; i < header.length; i++) {
    const h = header[i]
    if (candidates.some((c) => h.includes(c))) return i
  }
  return -1
}

function parseNamePairGrid(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim())
  return lines.map((line) => {
    if (line.includes("\t") && !line.includes(",")) {
      return line.split("\t").map((c) => c.trim())
    }
    return parseCsvLine(line)
  })
}

function buildNamePairIndex(rows: { wrestlerName: string; billedTo: string }[]) {
  const byKey = new Map<string, { wrestlerName: string; billedTo: string }>()
  const byWrestler = new Map<string, { wrestlerName: string; billedTo: string }[]>()
  for (const p of rows) {
    byKey.set(pauseMatchKey(p.wrestlerName, p.billedTo), p)
    if (p.billedTo) {
      byKey.set(pauseMatchKey(p.wrestlerName, ""), p)
    }
    const w = normalizePersonName(p.wrestlerName)
    if (!byWrestler.has(w)) byWrestler.set(w, [])
    byWrestler.get(w)!.push(p)
  }
  return { byKey, byWrestler }
}

function matchNamePairRow(
  row: { wrestlerName: string; billedTo: string },
  index: ReturnType<typeof buildNamePairIndex>,
): boolean {
  return lookupNamePairHit(row, index) != null
}

function lookupNamePairHit<T extends { wrestlerName: string; billedTo: string }>(
  row: { wrestlerName: string; billedTo: string },
  index: ReturnType<typeof buildNamePairIndex>,
): T | undefined {
  const exact = index.byKey.get(pauseMatchKey(row.wrestlerName, row.billedTo))
  if (exact) return exact as T
  if (row.billedTo) {
    const loose = index.byKey.get(pauseMatchKey(row.wrestlerName, ""))
    if (loose) return loose as T
  }
  const candidates = index.byWrestler.get(normalizePersonName(row.wrestlerName)) ?? []
  if (candidates.length === 1) return candidates[0] as T
  return undefined
}

export type ParsedWiqActiveRenewingRow = {
  wrestlerName: string
  billedTo: string
}

/** WIQ "Active June-Renewing Members" (or similar) — wrestler + parent allowlist for true actives. */
export function parseWiqActiveRenewingText(text: string): ParsedWiqActiveRenewingRow[] {
  const grid = parseNamePairGrid(text)
  if (!grid.length) return []

  let headerRowIdx = -1
  let header: string[] = []
  for (let i = 0; i < grid.length; i++) {
    const h = grid[i].map(normalizeHeader)
    const iWrestler = findHeaderIndex(h, ["wrestler names", "wrestler name", "wrestler"])
    if (iWrestler >= 0) {
      headerRowIdx = i
      header = h
      break
    }
  }
  if (headerRowIdx < 0) return []

  const iWrestler = findHeaderIndex(header, ["wrestler names", "wrestler name", "wrestler"])
  const iBilled = findHeaderIndex(header, [
    "parent/billed to",
    "billed to",
    "parent",
    "parent/guardian",
    "guardian",
  ])

  const out: ParsedWiqActiveRenewingRow[] = []
  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const cells = grid[r]
    const wrestlerName = (cells[iWrestler] ?? "").trim()
    if (!wrestlerName) continue
    out.push({
      wrestlerName,
      billedTo: iBilled >= 0 ? (cells[iBilled] ?? "").trim() : "",
    })
  }
  return out
}

/** Tag June-renewing members from WIQ's Active Renewing report (does not change status). */
export function applyActiveRenewingOverlay(
  rows: ParsedWiqCsvRow[],
  activeRows: ParsedWiqActiveRenewingRow[],
): { rows: ParsedWiqCsvRow[]; demotedFromActive: number; activeRenewingMatched: number } {
  if (!activeRows.length) return { rows, demotedFromActive: 0, activeRenewingMatched: 0 }

  const index = buildNamePairIndex(activeRows)
  let activeRenewingMatched = 0
  const merged = rows.map((row) => {
    if (row.status !== "active") return row
    if (!matchNamePairRow(row, index)) return row
    activeRenewingMatched += 1
    return row
  })
  return { rows: merged, demotedFromActive: 0, activeRenewingMatched }
}

/** WrestlingIQ "Currently Paused Subscription Report" (paused subs still show as Paid on the full summary). */
export function parseWiqPausedCsv(csvText: string): ParsedWiqPausedRow[] {
  const grid = parseCsvRows(csvText)
  if (grid.length < 2) return []

  const header = grid[0].map(normalizeHeader)
  const iWrestler = findHeaderIndex(header, ["wrestler names", "wrestler name", "wrestler"])
  const iBilled = findHeaderIndex(header, ["billed to", "parent", "parent/guardian", "guardian"])
  const iPaused = findHeaderIndex(header, ["paused", "paused date", "paused on", "when it was paused"])
  const iResume = findHeaderIndex(header, [
    "resume",
    "resume date",
    "automatically resume",
    "will automatically resume",
  ])
  const iPlan = findHeaderIndex(header, ["subscription", "subscription plan", "plan", "items", "membership"])

  if (iWrestler < 0) return []

  const out: ParsedWiqPausedRow[] = []
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]
    const wrestlerName = (cells[iWrestler] ?? "").trim()
    if (!wrestlerName) continue
    out.push({
      wrestlerName,
      billedTo: iBilled >= 0 ? (cells[iBilled] ?? "").trim() : "",
      pausedAt: iPaused >= 0 ? parseWiqDate(cells[iPaused] ?? "") : null,
      resumeAt: iResume >= 0 ? parseWiqDate(cells[iResume] ?? "") : null,
      planLabel: iPlan >= 0 ? (cells[iPlan] ?? "").trim() || null : null,
    })
  }
  return out
}

/** Mark Paid rows as paused when they appear on WIQ's paused report (match wrestler + billed to when possible). */
export function applyPausedOverlay(
  rows: ParsedWiqCsvRow[],
  pausedRows: ParsedWiqPausedRow[],
): { rows: ParsedWiqCsvRow[]; pausedApplied: number } {
  if (!pausedRows.length) return { rows, pausedApplied: 0 }

  const index = buildNamePairIndex(pausedRows)

  let pausedApplied = 0
  const merged = rows.map((row) => {
    if (row.status !== "active" && row.status !== "past_due") return row
    const hit = lookupNamePairHit<ParsedWiqPausedRow>(row, index)
    if (!hit) return row

    pausedApplied += 1
    return {
      ...row,
      status: "paused" as const,
      wiqStatusRaw: "Paused",
      nextDueAt: hit.resumeAt ?? row.nextDueAt,
    }
  })

  return { rows: merged, pausedApplied }
}

export function buildWiqImportPreview(
  csvText: string,
  athletes: AthleteForWiqMatch[],
  existingByWiqId: Map<string, { athlete_id: string | null }>,
  previouslyActiveWiqIds: string[],
  referenceDate?: Date,
  pausedCsvText?: string,
  activeRenewingText?: string,
): WiqImportPreview {
  let parsed = parseWiqMembershipCsv(csvText, referenceDate)
  let pausedApplied = 0
  let demotedFromActive = 0
  let activeRenewingMatched = 0
  let activeRenewingListCount: number | undefined

  if (pausedCsvText?.trim()) {
    const overlay = applyPausedOverlay(parsed, parseWiqPausedCsv(pausedCsvText))
    parsed = overlay.rows
    pausedApplied = overlay.pausedApplied
  }
  if (activeRenewingText?.trim()) {
    const activeRows = parseWiqActiveRenewingText(activeRenewingText)
    activeRenewingListCount = activeRows.length
    const overlay = applyActiveRenewingOverlay(parsed, activeRows)
    parsed = overlay.rows
    demotedFromActive = overlay.demotedFromActive
    activeRenewingMatched = overlay.activeRenewingMatched
  }
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
    pausedCount: parsed.filter((r) => r.status === "paused").length,
    duplicateWrestlerNames,
    rows,
    wouldFlagMissing,
    ...(pausedApplied > 0 ? { pausedApplied } : {}),
    ...(activeRenewingListCount != null ? { activeRenewingListCount } : {}),
    ...(activeRenewingMatched > 0 ? { activeRenewingMatched } : {}),
    ...(demotedFromActive > 0 ? { demotedFromActive } : {}),
  }
}

export function isWiqBillableStatus(status: WiqSubscriptionStatus): boolean {
  return status === "active" || status === "past_due" || status === "grace"
}

export function isWiqPausedStatus(status: string): boolean {
  return status === "paused"
}
