/**
 * Fargo Nationals result formatting helpers.
 */

export function parseFargoPlacement(raw: unknown): number | null {
  if (raw == null || raw === "") return null
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw)
  const s = String(raw).trim()
  const match = s.match(/^(\d+)/)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isFinite(n) ? n : null
}

export function formatFargoPlacementForDisplay(
  placement: number | string | null | undefined,
  isAllAmerican?: boolean,
): string {
  if (placement == null || placement === "") {
    return isAllAmerican ? "All-American" : ""
  }
  const n = typeof placement === "number" ? placement : parseFargoPlacement(placement)
  if (n == null) return String(placement).trim()
  if (n === 1) return "Champion"
  if (n === 2) return "2nd All-American"
  if (n === 3) return "3rd All-American"
  if (n <= 8) return `${n}th All-American`
  return `${n}th Place`
}

export function formatFargoRecord(wins: unknown, losses: unknown, record?: unknown): string {
  const rec = (record ?? "").toString().trim()
  if (rec) return rec
  const w = Number(wins)
  const l = Number(losses)
  if (Number.isFinite(w) && Number.isFinite(l)) return `${w}-${l}`
  return ""
}

export function formatFargoDivisionLabel(division: string | null | undefined): string {
  const d = (division ?? "").trim()
  if (!d) return ""
  return d.replace(/\s+Freestyle$/i, "").trim()
}
