export interface ParsedMatch {
  winnerName: string
  loserName: string
  winnerState?: string
  loserState?: string
  decisionType: string
  score: string
  placement: string
  weightClass?: string
}

export function parseFloUpdate(text: string): ParsedMatch | null {
  if (text.includes("is up next") || (text.includes(" vs ") && !text.includes("won by"))) {
    return null
  }

  if (text.includes("Bout") && text.includes("is up next")) {
    return null
  }

  if (!text.includes("won by")) {
    return null
  }

  const placementMatch = text.match(/\[(.*?)\]/)
  const placement = placementMatch ? placementMatch[1] : "Unknown"

  const winnerMatch = text.match(/:\s*(?:\[.*?\]\s*)?(.*?)\s*$$.*?$$\s*won by/)
  const winnerName = winnerMatch ? winnerMatch[1].trim() : ""

  const decisionMatch = text.match(/won by\s+(\w+)\s+over/)
  const decisionType = decisionMatch ? decisionMatch[1] : "DEC"

  const loserMatch = text.match(/over\s+(.*?)\s*$$.*?$$\s*(\d+-\d+|https)/)
  const loserName = loserMatch ? loserMatch[1].trim() : ""

  const scoreMatch = text.match(/(\d+-\d+)/)
  const score = scoreMatch ? scoreMatch[1] : "0-0"

  if (!winnerName || !loserName) {
    return null
  }

  return {
    winnerName,
    loserName,
    decisionType,
    score,
    placement,
  }
}

export function parseBracketUpdate(text: string): ParsedMatch | null {
  text = text.trim()

  if (!text || /^Round of/.test(text) || /^\d{3}$/.test(text)) {
    return null
  }

  if (!text.includes("(NC)")) {
    return null
  }

  // Extract weight class from start
  let weightClass: string | undefined
  const weightMatch = text.match(/^(\d{3})/)
  if (weightMatch) {
    weightClass = weightMatch[1]
    text = text.substring(weightMatch[0].length).trim()
  }

  // Find the method keyword
  const methodPattern = /\s+(TF|F|DEC|MD|FF)\s+/
  const methodMatch = text.match(methodPattern)

  if (!methodMatch) {
    return null
  }

  const method = methodMatch[1]
  const parts = text.split(new RegExp(`\\s+${method}\\s+`))

  if (parts.length !== 2) {
    return null
  }

  const winnerPart = parts[0].trim()
  const loserPart = parts[1].trim()

  // FIXED: Use $$ and $$ for literal parentheses, NOT $$ and $$
  const winnerStateMatch = winnerPart.match(/$$([A-Z]{2})$$/)
  const winnerState = winnerStateMatch ? winnerStateMatch[1] : undefined

  const loserStateMatch = loserPart.match(/$$([A-Z]{2})$$/)
  const loserState = loserStateMatch ? loserStateMatch[1] : undefined

  // Format: "Liam Myles Whispering Pines, NC (NC)" -> we want "Liam Myles"
  // Strategy: Take everything before the comma, then remove city name (last 1-3 words that are capitalized)

  function extractName(part: string): string {
    // Remove everything from comma onwards
    const beforeComma = part.split(",")[0].trim()

    // Split into words
    const words = beforeComma.split(/\s+/)

    // Name is typically first 2-3 words, city is the rest
    // Simple heuristic: take first 2 words as name if we have more than 2 words
    if (words.length <= 2) {
      return beforeComma
    }

    // If we have 3+ words, assume first 2 are name, rest is city
    // Example: "Liam Myles Whispering Pines" -> "Liam Myles"
    return words.slice(0, 2).join(" ")
  }

  const winnerName = extractName(winnerPart)
  const loserName = extractName(loserPart)

  // Extract score/time from end
  const scoreMatch = loserPart.match(/(\d+-\d+|\d+:\d+)/)
  const score = scoreMatch ? scoreMatch[1] : "0-0"

  console.log("[v0] Parsed bracket match:", {
    weightClass,
    winnerName,
    winnerState,
    method,
    loserName,
    loserState,
    score,
    hasNC: winnerState === "NC" || loserState === "NC",
  })

  if (!winnerName || !loserName) {
    return null
  }

  return {
    winnerName,
    loserName,
    winnerState,
    loserState,
    decisionType: method,
    score,
    placement: "Bracket",
    weightClass,
  }
}

export function parseMultipleUpdates(text: string): ParsedMatch[] {
  const lines = text.split("\n").filter((line) => line.trim())
  const matches: ParsedMatch[] = []

  for (const line of lines) {
    if (line.includes("FloSports:") || line.includes("won by")) {
      const match = parseFloUpdate(line)
      if (match) {
        matches.push(match)
        continue
      }
    }

    const bracketMatch = parseBracketUpdate(line)
    if (bracketMatch) {
      matches.push(bracketMatch)
    }
  }

  return matches
}
