/**
 * Narrow clarify-first helpers for ambiguous “our/we” Data Dawg asks.
 * Keep this small — only high-confusion scopes, not a general Q&A framework.
 */

const NHSCA_BEST_YEAR_RE =
  /\b(?:what\s+was\s+)?our\s+best\s+year\b|\bwhat\s+year\s+did\s+we\s+have\s+the\s+most\b|\bbest\s+year\s+for\s+(?:nhsca\s+)?all[-\s]?americans?\b/i

const HAS_NHSCA_AA_RE = /\bnhsca\b|\ball[-\s]?americans?\b/i

/** School explicitly named in the current user message (keep tight — avoid false positives). */
export function messageNamesSchool(message: string): boolean {
  return /\bhigh\s+school\b/i.test(message)
}

/** Pull a likely school label from recent assistant answers (dossier / matched footer). */
export function schoolFromRecentAssistant(prior: Array<{ role: string; content: string }>): string | null {
  for (let i = prior.length - 1; i >= 0; i--) {
    const h = prior[i]
    if (h.role !== "assistant") continue
    const text = h.content || ""
    const matched = text.match(/Matched:\s*([^\n·]+)/i)
    if (matched?.[1]) {
      const s = matched[1].replace(/·.*$/, "").trim()
      if (s.length >= 3 && s.length <= 60) return s
    }
    const hs = text.match(/(?:🏫\s*)?High\s+School[^\n]*\n+\s*([^\n]+)/i)
    if (hs?.[1]) {
      const s = hs[1].trim()
      if (s.length >= 3 && s.length <= 60 && !/^(career|college|class)/i.test(s)) return s
    }
  }
  return null
}

export function isNhscaBestYearOurWeAsk(message: string): boolean {
  const t = message.trim()
  if (t.length < 12) return false
  if (!HAS_NHSCA_AA_RE.test(t)) return false
  return NHSCA_BEST_YEAR_RE.test(t) || (/\b(?:our|we)\b/i.test(t) && /\bbest\s+year\b/i.test(t) && HAS_NHSCA_AA_RE.test(t))
}

export function formatNhscaBestYearScopeClarify(schoolHint: string): string {
  return (
    `Quick check before I answer — do you mean:\n\n` +
    `1. **North Carolina overall** — which year had the most NHSCA All-Americans statewide\n` +
    `2. **${schoolHint}** — that school’s best NHSCA All-American year\n\n` +
    `Reply with **1** or **2**.`
  )
}

/** User reply to a prior scope-clarify message. */
export function parseNhscaBestYearScopeFollowUp(
  message: string,
  prior: Array<{ role: string; content: string }>,
): "statewide" | "school" | null {
  const lastAsst = [...prior].reverse().find((h) => h.role === "assistant")
  if (!lastAsst?.content?.includes("North Carolina overall")) return null
  if (!lastAsst.content.includes("Reply with **1** or **2**")) return null

  const t = message.trim().toLowerCase()
  if (/^(1|one|statewide|north carolina|nc overall|whole state)\b/.test(t)) return "statewide"
  if (/^(2|two|that school|the school)\b/.test(t)) return "school"
  return null
}

/**
 * If this is an "our/we best year" NHSCA ask mid-thread with a school in context, clarify.
 * Cold chip / no school context → null (caller should answer statewide).
 */
export function tryNhscaBestYearScopeClarify(
  message: string,
  prior: Array<{ role: string; content: string }>,
): { answer: string; schoolHint: string } | null {
  if (!isNhscaBestYearOurWeAsk(message)) return null
  if (messageNamesSchool(message)) return null
  const schoolHint = schoolFromRecentAssistant(prior)
  if (!schoolHint) return null
  return { answer: formatNhscaBestYearScopeClarify(schoolHint), schoolHint }
}
