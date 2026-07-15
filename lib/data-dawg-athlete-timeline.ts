/**
 * SQL-grounded athlete career timeline for Data Dawg.
 * Built in code from verified tournament/commit rows — never LLM-invented.
 */

import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"
import { formatCommitTimelineLabel } from "@/lib/data-dawg-college-commit"

export type AthleteTimelineEvent = {
  year: number
  /** Short headline shown on the timeline (no leading year). */
  label: string
  /** Within-year sort: lower = earlier / more prominent. */
  priority: number
  kind:
    | "nchsaa"
    | "nhsca"
    | "super32"
    | "fargo"
    | "nc_united"
    | "mow"
    | "award"
    | "commit"
    | "record_book"
}

export type AthleteTimelineInput = {
  /** Graduation year when known — used only for Freshman–Senior labels. */
  graduationYear?: number | null
  nchsaa?: NchsaaRowForProfile[]
  nhsca?: TournamentResultForDisplay[]
  super32?: Array<TournamentResultForDisplay | Record<string, unknown>>
  fargo?: TournamentResultForDisplay[]
  ncUnited?: Array<{
    year?: number | string | null
    event?: string | null
    record?: string | null
    weight?: string | number | null
    isPlaceholder?: boolean
  }>
  dualsMow?: Array<{
    year?: number | string | null
    division?: string | null
    mow_weight_lb?: string | number | null
  }>
  awards?: Array<{ year?: number | string | null; label: string }>
  commit?: {
    college: string
    division?: string | null
    previousCollege?: string | null
    /** Year to place the commit on the timeline (usually grad year). */
    year?: number | null
  } | null
  seasonRecords?: Array<{
    year?: string | number | null
    record?: string | null
    wins?: number | null
    losses?: number | null
    classLabel?: string | null
  }>
}

const KIND_PRIORITY: Record<AthleteTimelineEvent["kind"], number> = {
  record_book: 5,
  nchsaa: 10,
  mow: 20,
  nhsca: 30,
  super32: 40,
  fargo: 50,
  nc_united: 60,
  award: 70,
  commit: 90,
}

function asYear(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const y = Math.floor(raw)
    return y >= 1990 && y <= 2035 ? y : null
  }
  if (typeof raw === "string") {
    // "2019-2020" → use ending spring year when present
    const season = raw.match(/(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2})/)
    if (season) {
      const end = parseInt(season[2], 10)
      return end >= 1990 && end <= 2035 ? end : null
    }
    const m = raw.match(/\b(19\d{2}|20\d{2})\b/)
    if (!m) return null
    const y = parseInt(m[1], 10)
    return y >= 1990 && y <= 2035 ? y : null
  }
  return null
}

/**
 * Derive HS class label from graduation year + event year.
 * Tournament year matching grad year ≈ Senior spring (NCHSAA States).
 * Returns null outside the traditional 4-year HS window (never invent).
 */
export function hsClassLabelForYear(
  graduationYear: number | null | undefined,
  eventYear: number,
): string | null {
  if (graduationYear == null || !Number.isFinite(graduationYear)) return null
  const gy = Math.floor(graduationYear)
  if (gy < 1990 || gy > 2050) return null
  const offset = gy - eventYear
  if (offset === 0) return "Senior"
  if (offset === 1) return "Junior"
  if (offset === 2) return "Sophomore"
  if (offset === 3) return "Freshman"
  return null
}

function weightBit(raw: unknown): string {
  const w = String(raw ?? "")
    .replace(/lbs?$/i, "")
    .trim()
  return w ? `${w}lbs` : ""
}

function detailBits(cls: string, weight: string): string {
  const bits = [cls, weight].filter(Boolean).join(", ")
  return bits ? ` (${bits})` : ""
}

function nchsaaTitleProgressionLabel(
  titleIndex: number,
  r: NchsaaRowForProfile,
  hadPriorPodium: boolean,
): string {
  const cls = (r.classification || "").toString().trim()
  const w = weightBit(r.weight_class)
  const detail = detailBits(cls, w)
  if (titleIndex === 0 && hadPriorPodium) {
    return `🏆 Broke through for first title${detail}`
  }
  if (titleIndex === 0) return `🏆 First State Championship${detail}`
  if (titleIndex === 1) return `🏆 Repeated as State Champion${detail}`
  if (titleIndex === 2) return `🏆 Third State Title${detail}`
  if (titleIndex === 3) return `🏆 Fourth State Title${detail}`
  return `🏆 ${titleIndex + 1}th State Title${detail}`
}

function nchsaaPlacerProgressionLabel(
  r: NchsaaRowForProfile,
  podiumIndex: number,
): string | null {
  if (r.place == null || r.place < 2 || r.place > 6) return null
  const cls = (r.classification || "").toString().trim()
  const w = weightBit(r.weight_class)
  const detail = detailBits(cls, w)
  const medal = r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : "🏅"
  const placeText = r.place === 2 ? "2nd" : r.place === 3 ? "3rd" : `${r.place}th`
  if (podiumIndex === 0) return `${medal} State ${placeText}${detail}`
  if (podiumIndex === 1) return `${medal} Returned to podium (${placeText})${detail}`
  return `${medal} State ${placeText}${detail}`
}

function parsePlaceNum(placement: unknown): number | null {
  if (placement == null) return null
  if (typeof placement === "number" && Number.isFinite(placement)) return Math.floor(placement)
  const s = String(placement).trim()
  if (!s || /^participated$/i.test(s)) return null
  if (/^champion$/i.test(s) || /^1st$/i.test(s)) return 1
  if (/^finalist$/i.test(s)) return 2
  const ord = s.match(/^(\d+)(st|nd|rd|th)?/i)
  if (ord) return parseInt(ord[1], 10)
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  return null
}

function isThinNationalResult(placement: string, record: string): boolean {
  const p = placement.trim()
  const r = record.trim()
  if (!p && !r) return true
  if (/^participated$/i.test(p) && !r) return true
  if (/^—$|^-$/.test(p) && !r) return true
  return false
}

function nhscaLabel(r: TournamentResultForDisplay, aaIndex: number): string | null {
  const placement = (r.placement ?? "").trim()
  const record = (r.record ?? "").trim()
  if (isThinNationalResult(placement, record)) return null
  const placeNum = parsePlaceNum(placement)
  const div = (r.division ?? "").trim()
  const w = weightBit(r.weight)
  const bits = [div, w].filter(Boolean).join(", ")
  const detail = bits ? ` (${bits})` : ""

  if (placeNum != null && placeNum >= 1 && placeNum <= 8) {
    if (placeNum === 1) return `🥇 NHSCA National Champion${detail}`
    if (placeNum === 2) {
      return aaIndex === 0
        ? `🥈 First NHSCA All-American — Runner-up${detail}`
        : `🥈 NHSCA National Runner-up${detail}`
    }
    if (placeNum === 3) {
      return aaIndex === 0 ? `🥉 First NHSCA All-American${detail}` : `🥉 NHSCA 3rd${detail}`
    }
    const ord = `${placeNum}th`
    return aaIndex === 0
      ? `🏅 First NHSCA All-American (${ord})${detail}`
      : `🏅 NHSCA ${ord} All-American${detail}`
  }
  if (placement && !/^participated$/i.test(placement)) {
    return `NHSCA ${placement}${detail}`
  }
  if (record) return `NHSCA Nationals — ${record.replace(/(\d+)\s*-\s*(\d+)/, "$1–$2")}${detail}`
  return null
}

function super32Label(r: TournamentResultForDisplay | Record<string, unknown>): string | null {
  const year = asYear(r.year)
  if (year == null) return null
  const placementRaw = (r as { placement?: unknown; place?: unknown }).placement ?? (r as { place?: unknown }).place
  const placement = String(placementRaw ?? "").trim()
  const record =
    String((r as { record?: unknown }).record ?? "").trim() ||
    ((r as { wins?: unknown }).wins != null && (r as { losses?: unknown }).losses != null
      ? `(${(r as { wins: unknown }).wins}-${(r as { losses: unknown }).losses})`
      : "")
  if (isThinNationalResult(placement, record)) return null

  const placeNum = parsePlaceNum(placementRaw)
  const w = weightBit((r as { weight?: unknown; weight_class?: unknown }).weight ?? (r as { weight_class?: unknown }).weight_class)
  const detail = w ? ` (${w})` : ""
  const recBit = record && !placement.toLowerCase().includes(record.toLowerCase()) ? ` ${record}` : ""

  if (placeNum != null && placeNum >= 1 && placeNum <= 8) {
    const medal = placeNum === 1 ? "🥇" : placeNum === 2 ? "🥈" : placeNum === 3 ? "🥉" : "🏅"
    if (placeNum === 1) return `${medal} Super32 Champion${detail}`
    const ord = placeNum === 2 ? "2nd" : placeNum === 3 ? "3rd" : `${placeNum}th`
    return `${medal} Super32 All-American (${ord})${detail}`
  }
  if (placement && !/^participated$/i.test(placement)) {
    return `Super32 ${placement}${detail}${recBit}`
  }
  if (record) return `Super32 — ${record.replace(/(\d+)\s*-\s*(\d+)/, "$1–$2")}${detail}`
  return null
}

function fargoLabel(r: TournamentResultForDisplay): string | null {
  const placement = (r.placement ?? "").trim()
  const record = (r.record ?? "").trim()
  if (isThinNationalResult(placement, record)) return null
  const placeNum = parsePlaceNum(placement)
  const div = (r.division ?? "").trim()
  const w = weightBit(r.weight)
  const bits = [div, w].filter(Boolean).join(", ")
  const detail = bits ? ` (${bits})` : ""
  if (placeNum != null && placeNum >= 1 && placeNum <= 8) {
    const medal = placeNum === 1 ? "🥇" : placeNum === 2 ? "🥈" : placeNum === 3 ? "🥉" : "🏅"
    const ord =
      placeNum === 1 ? "Champion" : placeNum === 2 ? "Runner-up" : placeNum === 3 ? "3rd" : `${placeNum}th`
    return `${medal} Fargo All-American (${ord})${detail}${record ? ` ${record.replace(/(\d+)\s*-\s*(\d+)/, "$1–$2")}` : ""}`
  }
  if (record) {
    const m = record.match(/(\d+)\s*[-–]\s*(\d+)/)
    const wins = m ? parseInt(m[1], 10) : 0
    const nice = record.replace(/(\d+)\s*-\s*(\d+)/, "$1–$2")
    if (wins >= 5) {
      return `🇺🇸 Fargo Nationals — ${nice}${detail} · Reached Blood Round`
    }
    return `🇺🇸 Fargo Nationals — ${nice}${detail}`
  }
  if (placement) return `🇺🇸 Fargo Nationals — ${placement}${detail}`
  return null
}

function dedupeKey(e: AthleteTimelineEvent): string {
  return `${e.year}|${e.kind}|${e.label.toLowerCase()}`
}

/** Collect notable timeline events from verified dossier sources. */
export function buildAthleteTimelineEvents(input: AthleteTimelineInput): AthleteTimelineEvent[] {
  const events: AthleteTimelineEvent[] = []
  const push = (year: number | null, kind: AthleteTimelineEvent["kind"], label: string | null) => {
    if (year == null || !label?.trim()) return
    events.push({
      year,
      kind,
      label: label.trim(),
      priority: KIND_PRIORITY[kind],
    })
  }

  const nchsaaChrono = [...(input.nchsaa ?? [])]
    .filter((r) => r.place != null && r.place >= 1 && r.place <= 6)
    .sort((a, b) => a.year - b.year)

  const hadPriorPodiumBeforeFirstTitle = (() => {
    const firstTitleIdx = nchsaaChrono.findIndex((r) => r.place === 1)
    if (firstTitleIdx <= 0) return false
    return nchsaaChrono.slice(0, firstTitleIdx).some((r) => (r.place ?? 0) >= 2)
  })()

  let titleIndex = 0
  let podiumIndex = 0
  for (const r of nchsaaChrono) {
    if (r.place === 1) {
      push(asYear(r.year), "nchsaa", nchsaaTitleProgressionLabel(titleIndex, r, hadPriorPodiumBeforeFirstTitle))
      titleIndex += 1
    } else {
      push(asYear(r.year), "nchsaa", nchsaaPlacerProgressionLabel(r, podiumIndex))
      podiumIndex += 1
    }
  }

  const nhscaSorted = [...(input.nhsca ?? [])].sort((a, b) => a.year - b.year)
  const seenNhsca = new Set<string>()
  let nhscaAaIndex = 0
  for (const r of nhscaSorted) {
    const placeNum = parsePlaceNum(r.placement)
    const isAa = placeNum != null && placeNum >= 1 && placeNum <= 8
    const label = nhscaLabel(r, isAa ? nhscaAaIndex : 0)
    if (!label) continue
    const key = `${r.year}-${label}`
    if (seenNhsca.has(key)) continue
    seenNhsca.add(key)
    if (isAa) nhscaAaIndex += 1
    push(asYear(r.year), "nhsca", label)
  }

  const seenS32 = new Set<string>()
  for (const r of input.super32 ?? []) {
    const label = super32Label(r)
    if (!label) continue
    const y = asYear((r as { year?: unknown }).year)
    const key = `${y}-${label}`
    if (seenS32.has(key)) continue
    seenS32.add(key)
    push(y, "super32", label)
  }

  for (const r of input.fargo ?? []) {
    push(asYear(r.year), "fargo", fargoLabel(r))
  }

  for (const r of input.ncUnited ?? []) {
    const y = asYear(r.year)
    if (y == null) continue
    if (r.isPlaceholder) continue
    const event = String(r.event ?? "NC United").trim() || "NC United"
    const rec = String(r.record ?? "").trim()
    const wt = r.weight != null && String(r.weight).trim() ? ` · ${r.weight} lbs` : ""
    const label = rec
      ? `NC United — ${event} — ${rec}${wt}`
      : `NC United — ${event}${wt}`
    push(y, "nc_united", label)
  }

  for (const m of input.dualsMow ?? []) {
    const y = asYear(m.year)
    const div = String(m.division ?? "").trim()
    const w = m.mow_weight_lb != null ? ` (${m.mow_weight_lb}lbs)` : ""
    push(y, "mow", `🏅 State Duals MOW${div ? ` — ${div}` : ""}${w}`)
  }

  for (const a of input.awards ?? []) {
    push(asYear(a.year), "award", `🏅 ${a.label}`)
  }

  for (const s of input.seasonRecords ?? []) {
    const y = asYear(s.year)
    const wins = s.wins != null ? Number(s.wins) : null
    const losses = s.losses != null ? Number(s.losses) : 0
    if (wins == null || !Number.isFinite(wins) || y == null) continue
    // Season W-L sits at the top of each year block (media-guide style).
    push(y, "record_book", `${Math.floor(wins)}–${Math.floor(losses)}`)
  }

  if (input.commit?.college?.trim()) {
    const y =
      asYear(input.commit.year) ??
      (input.graduationYear != null ? Math.floor(Number(input.graduationYear)) : null)
    if (y != null) {
      push(
        y,
        "commit",
        formatCommitTimelineLabel(
          input.commit.college,
          input.commit.previousCollege,
          input.commit.division,
        ),
      )
    }
  }

  const seen = new Set<string>()
  const unique: AthleteTimelineEvent[] = []
  for (const e of events) {
    const k = dedupeKey(e)
    if (seen.has(k)) continue
    seen.add(k)
    unique.push(e)
  }
  return unique.sort((a, b) => a.year - b.year || a.priority - b.priority || a.label.localeCompare(b.label))
}

/**
 * Format markdown career timeline (oldest → newest) with ↓ between years.
 * Returns empty string when there are no notable events.
 */
export function formatAthleteTimelineMarkdown(
  events: AthleteTimelineEvent[],
  graduationYear?: number | null,
): string {
  if (!events.length) return ""

  const byYear = new Map<number, AthleteTimelineEvent[]>()
  for (const e of events) {
    if (!byYear.has(e.year)) byYear.set(e.year, [])
    byYear.get(e.year)!.push(e)
  }
  const years = [...byYear.keys()].sort((a, b) => a - b)
  const blocks: string[] = []

  for (const year of years) {
    const classLabel = hsClassLabelForYear(graduationYear, year)
    const header = classLabel ? `**${year} · ${classLabel}**` : `**${year}**`
    const items = (byYear.get(year) ?? []).map((e) => e.label)
    blocks.push([header, ...items].join("\n"))
  }

  return ["Career progression:", "", blocks.join("\n\n↓\n\n")].join("\n")
}

/** Build + format in one call. */
export function buildAthleteTimelineMarkdown(input: AthleteTimelineInput): string {
  return formatAthleteTimelineMarkdown(
    buildAthleteTimelineEvents(input),
    input.graduationYear ?? null,
  )
}

/** Map loose cross-store row bags into timeline input (alumni path). */
export function timelineInputFromCrossStore(data: {
  nchsaa_state?: Record<string, unknown>[]
  nhsca_placements?: Record<string, unknown>[]
  nhsca_legacy_table?: Record<string, unknown>[]
  super32?: Record<string, unknown>[]
  fargo?: Record<string, unknown>[]
  nc_united_results?: Record<string, unknown>[]
}): AthleteTimelineInput {
  const nchsaa: NchsaaRowForProfile[] = (data.nchsaa_state ?? []).map((r) => ({
    year: Number(r.year) || 0,
    classification: String(r.classification ?? ""),
    weight_class: String(r.weight_class ?? ""),
    place: r.place != null && Number.isFinite(Number(r.place)) ? Number(r.place) : null,
    school: String(r.school ?? r.high_school ?? ""),
    wrestler_name: String(r.wrestler_name ?? r.name ?? ""),
  }))

  const toDisplay = (r: Record<string, unknown>): TournamentResultForDisplay => ({
    year: Number(r.year) || 0,
    placement: String(r.placement ?? r.place ?? ""),
    record: String(r.record ?? ""),
    weight: String(r.weight_class ?? r.weight ?? ""),
    division: String(r.division ?? ""),
  })

  return {
    nchsaa: nchsaa.filter((r) => r.year > 0),
    nhsca: [...(data.nhsca_placements ?? []), ...(data.nhsca_legacy_table ?? [])].map(toDisplay),
    super32: (data.super32 ?? []).map(toDisplay),
    fargo: (data.fargo ?? []).map(toDisplay),
    ncUnited: (data.nc_united_results ?? []).map((r) => ({
      year: r.year as number | string | null,
      event: String(r.event ?? r.event_name ?? "NC United"),
      record: String(r.record ?? ""),
      weight: r.weight ?? r.weight_class ?? null,
      isPlaceholder: Boolean(r.isPlaceholder),
    })),
  }
}
