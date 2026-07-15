/** Shared normalization for public-source import diffs. */

/** Straight apostrophe for storage / unique keys (NCHSAA pages often use ` or ’). */
export function canonicalizeWrestlerName(s: unknown): string {
  return String(s ?? "")
    .replace(/[`´′’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function normText(s: unknown): string {
  return canonicalizeWrestlerName(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Compare names ignoring "Last, First" vs "First Last". */
export function namesLooselyEqual(a: unknown, b: unknown): boolean {
  const na = normText(a)
  const nb = normText(b)
  if (!na || !nb) return na === nb
  if (na === nb) return true
  const flip = (s: string) => {
    if (!s.includes(",")) return s
    const [last, ...rest] = s.split(",")
    return `${rest.join(",").trim()} ${last.trim()}`.replace(/\s+/g, " ").trim()
  }
  return flip(na) === flip(nb) || flip(na) === nb || na === flip(nb)
}

export function dualNaturalKey(year: number, division: string): string {
  return `${year}|${normText(division)}`
}

export function placerNaturalKey(
  year: number,
  classification: string,
  weightClass: string,
  place: number,
  gender?: string | null,
): string {
  const g = gender === "M" || gender === "F" ? gender : ""
  return `${year}|${normText(classification)}|${normText(weightClass)}|${place}|${g}`
}

export function schoolsLooselyEqual(a: unknown, b: unknown): boolean {
  const na = normText(a).replace(/\bhigh school\b/g, "").replace(/\s+/g, " ").trim()
  const nb = normText(b).replace(/\bhigh school\b/g, "").replace(/\s+/g, " ").trim()
  return na === nb
}
