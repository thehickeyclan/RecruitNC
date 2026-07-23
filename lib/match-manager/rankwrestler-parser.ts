export type RankParsedMatch = {
  date: string
  winner: string
  winner_school: string
  loser: string
  loser_school: string
  result: string
  venue: string
  weight: string
  opp_percent: number | null
}

export type ProfileMatch = {
  date: string
  weight: number
  opponent: string
  opponent_school: string
  result: string
  venue: string
  win_loss: "W" | "L"
  opponent_percentage: string | null
}

export type RankWrestlerSeasonPayload = {
  wrestler_info: {
    first_name: string
    last_name: string
    season: string
    grade: string
    high_school: string
  }
  season_summary: {
    total_matches: number
    wins: number
    losses: number
    pins: number
    tech_falls: number
    decisions: number
    major_decisions: number
    forfeits_won: number
    pin_percentage: number
    tf_percentage: number
    finishing_percentage: number
  }
  matches: ProfileMatch[]
}

export type RankWrestlerParseResult =
  | {
      success: true
      payload: RankWrestlerSeasonPayload
      diagnostics: {
        parsedMatches: number
        dedupedMatches: number
        duplicatesRemoved: number
        season: string
        grade: string
      }
    }
  | { success: false; error: string }

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, "\"")
}

export function visibleTextFromRankWrestlerHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, "\t")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(div|p|section|article|li|ul|ol|table|tbody|thead|h\d)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
}

function decodeJavaScriptStringLiteral(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`)
  } catch {
    return value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, "\"")
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\")
  }
}

function normalizeRankWrestlerPayloadText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}\[\]",:]+/g, "\n")
    .replace(/\$[LS@]react\.[A-Za-z.]+/g, "\n")
    .replace(/\$[A-Za-z0-9_@.-]+/g, "\n")
    .replace(/\b(?:children|className|style|href|src|alt|title|id|key|props|data|rows?|columns?|value|label)\b/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

/**
 * RankWrestler is a Next/React app. Authenticated pages can return the match data inside
 * streamed `self.__next_f.push(...)` script payloads even when the rendered HTML body only
 * says "RankWrestlers". Return multiple text candidates so callers can try the normal parser
 * against each source before giving up.
 */
export function rankWrestlerTextCandidatesFromHtml(html: string): Array<{ source: string; text: string }> {
  const candidates: Array<{ source: string; text: string }> = []
  const seen = new Set<string>()

  const addCandidate = (source: string, text: string) => {
    const normalized = normalizeRankWrestlerPayloadText(text)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    candidates.push({ source, text: normalized })
  }

  addCandidate("visible_html", visibleTextFromRankWrestlerHtml(html))

  const scriptBodies = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1] ?? "")
  const flightScriptBodies = scriptBodies.filter((script) => /__next_f\.push|self\.__next_f/i.test(script))
  if (flightScriptBodies.length) {
    addCandidate("next_flight_raw", flightScriptBodies.join("\n"))
  }

  const decodedFlightChunks: string[] = []
  for (const script of flightScriptBodies) {
    for (const match of script.matchAll(/"((?:\\.|[^"\\])*)"/g)) {
      const raw = match[1] ?? ""
      if (raw.length < 2) continue
      const decoded = decodeJavaScriptStringLiteral(raw)
      if (/win|loss|opponent|weight|matches|season|fall|decision|\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(decoded)) {
        decodedFlightChunks.push(decoded)
      }
    }
  }
  if (decodedFlightChunks.length) {
    addCandidate("next_flight_decoded", decodedFlightChunks.join("\n"))
  }

  return candidates
}

function parseTrackFormat(lines: string[]): RankParsedMatch[] {
  const matches: RankParsedMatch[] = []
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean)

  const tryParseSummary = (summary: string): RankParsedMatch | null => {
    if (!summary || summary.toLowerCase().includes("bye")) return null
    if (summary.toLowerCase().includes("unknown") && summary.toLowerCase().includes("for")) return null
    const overMatch = summary.match(
      /(?:.+\s-\s)?(.+?)\s*\(([^)]+)\)\s+over\s+(.+?)\s*\(([^)]+)\)\s*(?:\(([^)]+)\))?\s*$/,
    )
    if (!overMatch) return null
    const [, winner, winnerSchool, loser, loserSchool, resultRaw] = overMatch
    if (loser.trim().toLowerCase() === "unknown") return null
    return {
      date: "",
      winner: winner.trim(),
      winner_school: winnerSchool.trim(),
      loser: loser.trim(),
      loser_school: loserSchool.trim(),
      result: resultRaw ? resultRaw.replace(/[()]/g, "").trim() : "",
      venue: "",
      weight: "",
      opp_percent: null,
    }
  }

  const headerLine = (nonEmpty[0] ?? "").toLowerCase()
  const hasHeader = headerLine.includes("date") && (headerLine.includes("summary") || headerLine.includes("event"))
  const startIdx = hasHeader ? 1 : 0

  for (let i = startIdx; i < nonEmpty.length; i++) {
    const parts = (nonEmpty[i] ?? "").split(/\t/).map((p) => p.trim())
    if (parts.length < 4) continue
    const [date, event, weight, summary] = parts
    const parsed = tryParseSummary(summary)
    if (!parsed) continue
    matches.push({
      ...parsed,
      date: date || "",
      venue: event || "",
      weight: weight ? weight.replace(/^\d*A\s+/i, "").replace(/\s*lbs\s*$/i, "").trim() : "",
    })
  }

  return matches
}

function parseInlineRenderedRankWrestlerText(rawText: string): RankParsedMatch[] {
  if (/(?:^|\n)\s*(?:Win|Loss)\s*\n\s*\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(rawText)) return []

  const normalized = rawText.replace(/\s+/g, " ").trim()
  if (!/\b(?:Win|Loss)\s+\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(normalized)) return []

  const chunks = normalized
    .split(/(?=\b(?:Win|Loss)\s+\d{1,2}\/\d{1,2}\/\d{2,4}\b)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  const matches: RankParsedMatch[] = []
  for (const chunk of chunks) {
    const header = chunk.match(/^(Win|Loss)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:(\d+(?:\.\d+)?)\s+)?([\s\S]+)$/i)
    if (!header) continue
    const [, resultLine = "", date = "", pctRaw, restRaw = ""] = header
    const weightMatch = restRaw.match(/\s(\d+)\s*lbs\b/i)
    if (!weightMatch?.index) continue

    const isWin = resultLine.toLowerCase() === "win"
    const preWeight = restRaw.slice(0, weightMatch.index).trim()
    const weight = weightMatch[1] ?? ""
    const postWeight = restRaw.slice(weightMatch.index + weightMatch[0].length).trim()
    const preParts = preWeight.split(/\s*[•·]\s*/).map((part) => part.trim()).filter(Boolean)
    const opponent = preParts[0] ?? ""
    const opponentSchool = preParts.slice(1).join(" • ")
    const postParts = postWeight.replace(/^[•·]\s*/, "").split(/\s*[•·]\s*/).map((part) => part.trim()).filter(Boolean)
    if (!opponent || !weight || postParts.length < 2) continue
    const venue = postParts[0] ?? ""
    const method = postParts.slice(1).join(" • ")
    matches.push({
      date,
      winner: isWin ? "" : opponent,
      winner_school: isWin ? "" : opponentSchool,
      loser: isWin ? opponent : "",
      loser_school: isWin ? opponentSchool : "",
      result: method,
      venue,
      weight,
      opp_percent: pctRaw ? parseFloat(pctRaw) : null,
    })
  }
  return matches
}

export function parseRankWrestlerText(rawText: string, format: "rank" | "track" = "rank"): RankParsedMatch[] {
  const allLines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n")
  if (format === "track") return parseTrackFormat(allLines)

  const inlineMatches = parseInlineRenderedRankWrestlerText(rawText)
  if (inlineMatches.length > 0) return inlineMatches

  const matches: RankParsedMatch[] = []
  const denseLines = allLines.map((l) => l.trim()).filter(Boolean)
  const embeddedRankStart = denseLines.findIndex((line, index) => {
    const lower = line.toLowerCase()
    return (lower === "win" || lower === "loss") && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(denseLines[index + 1] ?? "")
  })
  if (embeddedRankStart > 0) {
    return parseRankWrestlerText(denseLines.slice(embeddedRankStart).join("\n"), format)
  }

  const firstLine = (denseLines[0] ?? "").toLowerCase()
  const looksLikeDate = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(denseLines[0] ?? "")
  const isWinLossFirst = firstLine === "win" || firstLine === "loss"
  const isDateFirstRank =
    looksLikeDate &&
    denseLines.length >= 8 &&
    (denseLines[9]?.toLowerCase() === "win" ||
      denseLines[7]?.toLowerCase() === "win" ||
      denseLines[9]?.toLowerCase() === "loss" ||
      denseLines[7]?.toLowerCase() === "loss")

  if (isDateFirstRank) {
    let i = 0
    while (i < denseLines.length) {
      const date = denseLines[i] ?? ""
      if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(date)) {
        i++
        continue
      }
      const isForfeit = (denseLines[i + 1] ?? "").toLowerCase() === "forfeit"
      const winLoss = (denseLines[i + (isForfeit ? 7 : 9)] ?? "").toLowerCase()
      if (winLoss !== "win" && winLoss !== "loss") {
        i++
        continue
      }
      const isWin = winLoss === "win"
      const opponent = isForfeit ? "Forfeit" : (denseLines[i + 2] ?? "")
      const opponentSchool = isForfeit ? "" : (denseLines[i + 3] ?? "").replace(/^[•·\-]\s*/, "").trim()
      const weight = (denseLines[i + (isForfeit ? 2 : 4)] ?? "").replace(/\s*lbs\s*$/i, "").trim()
      const venue = denseLines[i + (isForfeit ? 4 : 6)] ?? ""
      const method = denseLines[i + (isForfeit ? 6 : 8)] ?? ""
      const pct = !isForfeit && /^[\d.]+$/.test(denseLines[i + 1] ?? "") ? parseFloat(denseLines[i + 1] ?? "") : null
      matches.push({
        date,
        winner: isWin ? "" : opponent,
        winner_school: isWin ? "" : opponentSchool,
        loser: isWin ? opponent : "",
        loser_school: isWin ? opponentSchool : "",
        result: method,
        venue,
        weight,
        opp_percent: pct,
      })
      i += isForfeit ? 8 : 10
    }
    return matches
  }

  if (isWinLossFirst) {
    // RankWrestler renders two line orderings for the same match list, and blocks vary in
    // which lines exist at all (rating, school, opponent):
    //   A: W/L, date, opponent, [• school], weight, •, METHOD, VENUE, [rating]
    //   B: W/L, date, [rating], opponent|Forfeit, [• school], weight, •, VENUE, •, METHOD
    // The old parser walked fixed offsets, so any block missing a school (unattached
    // opponents), missing a rating (e.g. out-of-state wrestlers), or a forfeit shifted the
    // offsets, landed "•" in the venue slot, and the row was silently dropped — a real
    // profile lost 15 of 63 matches that way. Classify lines by TYPE within each block
    // instead: school lines start "• text", separators are exactly "•", weights are
    // "N lbs", ratings are pure numerics. The two orderings are told apart by whether a
    // standalone bullet sits between the two remaining text lines (B) or not (A).
    const isWinLoss = (line: string) => /^(?:win|loss)$/i.test(line)
    const isDate = (line: string) => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line)
    const isSeparator = (line: string) => /^[•·]$/.test(line)
    const isSchool = (line: string) => /^[•·]\s+\S/.test(line)
    const isWeight = (line: string) => /^\d+\s*lbs$/i.test(line)
    const isNumeric = (line: string) => /^[\d.]+$/.test(line)

    const blockStarts: number[] = []
    for (let i = 0; i < denseLines.length - 1; i++) {
      if (isWinLoss(denseLines[i] ?? "") && isDate(denseLines[i + 1] ?? "")) blockStarts.push(i)
    }

    for (let b = 0; b < blockStarts.length; b++) {
      const start = blockStarts[b]!
      const end = b + 1 < blockStarts.length ? blockStarts[b + 1]! : denseLines.length
      const isWin = (denseLines[start] ?? "").toLowerCase() === "win"
      const date = denseLines[start + 1] ?? ""

      let opponent = ""
      let opponentSchool = ""
      let weight = ""
      let oppPercent: number | null = null
      let isForfeit = false
      // Text lines that aren't opponent/school/weight/rating — venue and method, in render
      // order, with a marker for whether a standalone bullet preceded the second one.
      const tail: string[] = []
      let bulletBeforeTail2 = false

      for (let i = start + 2; i < end; i++) {
        const line = denseLines[i] ?? ""
        if (isSeparator(line)) {
          if (tail.length === 1) bulletBeforeTail2 = true
          continue
        }
        if (isWeight(line)) {
          if (!weight) weight = line.replace(/\s*lbs\s*$/i, "").trim()
          continue
        }
        if (/^forfeit$/i.test(line)) {
          isForfeit = true
          continue
        }
        if (isNumeric(line)) {
          // Rating: right after the date (B) or trailing the block (A). Either way, the
          // first numeric wins and never lands in venue/method.
          if (oppPercent === null) oppPercent = parseFloat(line)
          continue
        }
        if (isSchool(line)) {
          if (!opponentSchool) opponentSchool = line.replace(/^[•·]\s*/, "").trim()
          continue
        }
        if (!opponent && !isForfeit && !weight) {
          // First plain text before the weight is the opponent name (may never come — a
          // forfeit block has none).
          opponent = line
          continue
        }
        tail.push(line)
      }

      if (isForfeit) opponent = "Forfeit"
      // venue/method from the tail: bullet between them → B (venue first); else A (method
      // first). Single-entry tails are a venue with an implied method only for forfeits.
      let venue = ""
      let method = ""
      if (tail.length >= 2) {
        if (bulletBeforeTail2) {
          venue = tail[0] ?? ""
          method = tail.slice(1).join(" • ")
        } else {
          method = tail[0] ?? ""
          venue = tail.slice(1).join(" • ")
        }
      } else if (tail.length === 1 && isForfeit) {
        venue = tail[0] ?? ""
        method = "For."
      }

      if (!opponent || !weight || !venue || isNumeric(venue)) continue

      matches.push({
        date,
        winner: isWin ? "" : opponent,
        winner_school: isWin ? "" : opponentSchool,
        loser: isWin ? opponent : "",
        loser_school: isWin ? opponentSchool : "",
        result: method,
        venue,
        weight,
        opp_percent: oppPercent,
      })
    }
    return matches
  }

  const headerLine = (allLines[0] ?? "").toLowerCase()
  const isSummaryFormat = headerLine.includes("summary")
  if (isSummaryFormat) return parseTrackFormat(allLines)

  for (let i = 1; i < allLines.length; i++) {
    const parts = (allLines[i] ?? "").trim().split("\t")
    if (parts.length < 8) continue
    const [date, winner, winner_school, loser, loser_school, result, venue, weight, opp_percent] = parts
    matches.push({
      date: date.trim(),
      winner: winner.trim(),
      winner_school: winner_school.trim(),
      loser: loser.trim(),
      loser_school: loser_school.trim(),
      result: result.trim(),
      venue: venue.trim(),
      weight: weight.trim(),
      opp_percent: opp_percent ? parseFloat(opp_percent.trim()) : null,
    })
  }

  return matches
}

function dateParts(date: string): { month: number; day: number; year: number } | null {
  const parts = date.split(/[-/]/)
  if (parts.length !== 3) return null
  const month = Number.parseInt(parts[0] ?? "", 10)
  const day = Number.parseInt(parts[1] ?? "", 10)
  const rawYear = Number.parseInt(parts[2] ?? "", 10)
  if (!month || !day || !rawYear) return null
  const year = rawYear < 100 ? (rawYear > 50 ? 1900 + rawYear : 2000 + rawYear) : rawYear
  return { month, day, year }
}

function gradeFromSeason(season: string, graduationYear?: number | null): string {
  const start = Number.parseInt(season.split("-")[0] ?? "", 10)
  if (Number.isFinite(start) && graduationYear) {
    const yearsUntilGraduation = graduationYear - start
    if (yearsUntilGraduation === 1) return "Senior"
    if (yearsUntilGraduation === 2) return "Junior"
    if (yearsUntilGraduation === 3) return "Sophomore"
    if (yearsUntilGraduation === 4) return "Freshman"
  }
  return "Unknown"
}

export function buildRankWrestlerSeasonPayload(options: {
  athleteName: string
  graduationYear?: number | null
  highSchool?: string | null
  rawText: string
  format?: "rank" | "track"
  deduplicate?: boolean
}): RankWrestlerParseResult {
  const parsedMatches = parseRankWrestlerText(options.rawText, options.format ?? "rank")
  if (parsedMatches.length === 0) return { success: false, error: "No valid matches were found in the RankWrestler source." }

  const athleteNameLower = options.athleteName.trim().toLowerCase()
  const athleteParts = athleteNameLower.split(/\s+/)
  const athleteFirstInitial = athleteParts[0]?.[0] || ""
  const athleteLastName = athleteParts[athleteParts.length - 1] || ""
  const converted: ProfileMatch[] = []
  let athleteSchool = ""

  for (const match of parsedMatches) {
    const isNewFormat = match.winner === "" || match.loser === ""
    let isWin = false
    let opponent = ""
    let opponentSchool = ""

    if (isNewFormat) {
      isWin = match.winner === ""
      opponent = isWin ? match.loser : match.winner
      opponentSchool = isWin ? match.loser_school : match.winner_school
    } else {
      const winnerLower = match.winner.toLowerCase()
      const loserLower = match.loser.toLowerCase()
      const winnerParts = winnerLower.split(/\s+/)
      const loserParts = loserLower.split(/\s+/)
      const isWinnerMatch =
        winnerLower === athleteNameLower ||
        (winnerParts[0]?.[0] === athleteFirstInitial && winnerParts[winnerParts.length - 1] === athleteLastName)
      const isLoserMatch =
        loserLower === athleteNameLower ||
        (loserParts[0]?.[0] === athleteFirstInitial && loserParts[loserParts.length - 1] === athleteLastName)
      if (!isWinnerMatch && !isLoserMatch) continue
      isWin = isWinnerMatch && !isLoserMatch
      opponent = isWin ? match.loser : match.winner
      opponentSchool = isWin ? match.loser_school : match.winner_school
      if (!athleteSchool) athleteSchool = isWin ? match.winner_school : match.loser_school
    }

    converted.push({
      date: match.date.trim(),
      weight: Number.parseInt(match.weight, 10) || 0,
      opponent: opponent.trim(),
      opponent_school: opponentSchool.trim(),
      result: match.result.trim(),
      venue: match.venue.trim(),
      win_loss: isWin ? "W" : "L",
      opponent_percentage: match.opp_percent !== null ? String(match.opp_percent) : null,
    })
  }

  if (converted.length === 0) return { success: false, error: "Parsed matches, but none could be matched to the selected athlete." }

  const seen = new Set<string>()
  const finalMatches = options.deduplicate === false ? converted : converted.filter((m) => {
    const key = `${m.date}|${m.opponent.toLowerCase()}|${m.win_loss}|${m.result.toLowerCase()}|${m.venue.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const dates = finalMatches.map((m) => dateParts(m.date)).filter(Boolean) as Array<{ month: number; day: number; year: number }>
  const years = dates.map((d) => d.year)
  const minYear = years.length ? Math.min(...years) : NaN
  const maxYear = years.length ? Math.max(...years) : NaN
  let season = "Unknown"
  if (Number.isFinite(minYear) && Number.isFinite(maxYear)) {
    if (minYear === maxYear) {
      const hasLateYear = dates.some((d) => d.month >= 8)
      season = hasLateYear ? `${minYear}-${String(minYear + 1).slice(-2)}` : `${minYear - 1}-${String(minYear).slice(-2)}`
    } else {
      season = `${minYear}-${String(maxYear).slice(-2)}`
    }
  }

  const wins = finalMatches.filter((m) => m.win_loss === "W").length
  const losses = finalMatches.filter((m) => m.win_loss === "L").length
  const pins = finalMatches.filter((m) => m.win_loss === "W" && m.result.toLowerCase().includes("fall")).length
  const techFalls = finalMatches.filter((m) => m.win_loss === "W" && /(tf|tech)/i.test(m.result)).length
  const majorDecisions = finalMatches.filter((m) => m.win_loss === "W" && /major/i.test(m.result)).length
  const decisions = finalMatches.filter((m) => m.win_loss === "W" && /(dec|sv)/i.test(m.result)).length
  const forfeits = finalMatches.filter(
    (m) => m.win_loss === "W" && (m.opponent.toLowerCase() === "forfeit" || /^(for|for\.|forf\.?|forfeit|ff\.?)$/i.test(m.result)),
  ).length
  const totalMatches = wins + losses
  const firstName = options.athleteName.split(/\s+/)[0] || ""
  const lastName = options.athleteName.split(/\s+/).slice(1).join(" ") || ""
  const grade = gradeFromSeason(season, options.graduationYear)

  return {
    success: true,
    payload: {
      wrestler_info: {
        first_name: firstName,
        last_name: lastName,
        season,
        grade,
        high_school: options.highSchool || athleteSchool || "Unknown",
      },
      season_summary: {
        total_matches: totalMatches,
        wins,
        losses,
        pins,
        tech_falls: techFalls,
        decisions,
        major_decisions: majorDecisions,
        forfeits_won: forfeits,
        pin_percentage: totalMatches > 0 ? Number(((pins / totalMatches) * 100).toFixed(1)) : 0,
        tf_percentage: totalMatches > 0 ? Number(((techFalls / totalMatches) * 100).toFixed(1)) : 0,
        finishing_percentage: totalMatches > 0 ? Number((((pins + techFalls) / totalMatches) * 100).toFixed(1)) : 0,
      },
      matches: finalMatches,
    },
    diagnostics: {
      parsedMatches: converted.length,
      dedupedMatches: finalMatches.length,
      duplicatesRemoved: converted.length - finalMatches.length,
      season,
      grade,
    },
  }
}
