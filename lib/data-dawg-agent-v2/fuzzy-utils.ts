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

  let combined = lastS * 0.52 + firstS * 0.28 + fullS * 0.2

  // Two-token queries ("Tyler Tracy"): strong first-name overlap must not outweigh a wrong surname
  // ("Tyler Gardner" scored ~0.28+ and ranked above the real Tracy without this cap).
  if (qParts.length >= 2 && l && searchLast) {
    const ldLast = levenshteinDistance(searchLast, l)
    const maxOkLast = searchLast.length <= 4 ? 1 : 2
    if (ldLast > maxOkLast) {
      combined = Math.min(combined, 0.17)
    }
  }

  return combined
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

/**
 * When the query mixes a person name with a school ("Jacob Perry Cardinal Gibbons"),
 * plain `scoreAthleteNameMatch` treats the last token as last name and scores poorly.
 * Combine: best name score from full phrase + "first two tokens" as first+last, plus school-token match.
 */
export function combinedAthleteSearchScore(
  phraseLower: string,
  nameTokens: string[],
  first: string,
  last: string,
  displayName: string,
  highschool: string,
): number {
  let nameScore = scoreAthleteNameMatch(phraseLower, first, last, displayName)
  if (nameTokens.length >= 2) {
    const two = `${nameTokens[0]} ${nameTokens[1]}`
    nameScore = Math.max(nameScore, scoreAthleteNameMatch(two, first, last, displayName))
  }

  const hs = (highschool || "").toLowerCase().trim()
  let schoolMatch = 0
  if (hs && nameTokens.length >= 3) {
    schoolMatch = Math.max(schoolMatch, scoreSchoolMatch(nameTokens.slice(2).join(" "), hs))
    for (let i = 2; i < nameTokens.length; i++) {
      schoolMatch = Math.max(schoolMatch, scoreSchoolMatch(nameTokens[i], hs))
      for (let j = i + 1; j <= Math.min(i + 3, nameTokens.length); j++) {
        schoolMatch = Math.max(schoolMatch, scoreSchoolMatch(nameTokens.slice(i, j).join(" "), hs))
      }
    }
  }

  // School match must not promote rows whose first two tokens disagree with directory surname
  // ("Tyler Tracy Jacksonville" vs a Tyler Gardner at that school).
  if (schoolMatch > 0.35 && nameTokens.length >= 2) {
    const stemOnly = scoreAthleteNameMatch(`${nameTokens[0]} ${nameTokens[1]}`, first, last, displayName)
    if (stemOnly <= 0.2) {
      return stemOnly
    }
  }

  if (schoolMatch > 0.35) {
    return Math.min(1, nameScore + schoolMatch * 0.45)
  }
  return nameScore
}
