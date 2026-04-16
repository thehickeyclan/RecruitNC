/** Levenshtein distance (iterative, small strings only). */
export function levenshteinDistance(a: string, b: string): number {
  const s = a || ""
  const t = b || ""
  if (s === t) return 0
  if (!s.length) return t.length
  if (!t.length) return s.length
  const m = s.length
  const n = t.length
  const v0 = new Array<number>(n + 1)
  const v1 = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) v0[j] = j
  for (let i = 0; i < m; i++) {
    v1[0] = i + 1
    for (let j = 0; j < n; j++) {
      const cost = s.charCodeAt(i) === t.charCodeAt(j) ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j <= n; j++) v0[j] = v1[j]
  }
  return v1[n]
}

function simFromDistance(d: number, lenA: number, lenB: number): number {
  const maxL = Math.max(lenA, lenB, 1)
  return 1 - d / maxL
}

/**
 * Score 0–1 how well a query matches first/last/full display name.
 * Emphasizes last name (typos like "Millnar" vs "Millner").
 */
export function scoreAthleteNameMatch(
  queryNorm: string,
  first: string,
  last: string,
  displayName: string,
): number {
  const q = queryNorm.toLowerCase().trim()
  const f = (first || "").toLowerCase().trim()
  const l = (last || "").toLowerCase().trim()
  const full = (displayName || "").toLowerCase().trim() || `${f} ${l}`.trim()

  if (!q) return 0
  if (full === q || (f && l && `${f} ${l}` === q)) return 1
  if (full.includes(q) || q.includes(full)) return 0.95

  const qParts = q.split(/\s+/).filter(Boolean)
  const searchFirst = qParts[0] || ""
  const searchLast = qParts.length > 1 ? qParts[qParts.length - 1] : q

  const fullD = levenshteinDistance(q, full)
  const fullS = simFromDistance(fullD, q.length, full.length)

  let lastS = 0
  if (l && searchLast) {
    const ld = levenshteinDistance(searchLast, l)
    lastS = simFromDistance(ld, searchLast.length, l.length)
  }

  let firstS = 0
  if (f && searchFirst && qParts.length > 1) {
    const fd = levenshteinDistance(searchFirst, f)
    firstS = simFromDistance(fd, searchFirst.length, f.length)
  } else if (f && qParts.length === 1) {
    const fd = levenshteinDistance(q, f)
    firstS = simFromDistance(fd, q.length, f.length)
  }

  return lastS * 0.52 + firstS * 0.28 + fullS * 0.2
}

export function scoreSchoolMatch(queryNorm: string, schoolName: string): number {
  const q = queryNorm.toLowerCase().trim()
  const s = (schoolName || "").toLowerCase().trim()
  if (!q || !s) return 0
  if (s === q) return 1
  if (s.includes(q) || q.includes(s)) return 0.92
  const d = levenshteinDistance(q, s)
  return simFromDistance(d, q.length, s.length)
}
