import "server-only"

import {
  SUMMARY_SYSTEM_PROMPT,
  stripSeasonFraming,
  stripUnsupportedSentences,
  summaryFacts,
  unsupportedSummaryClaims,
  type ScoutingReport,
} from "@/lib/scouting-report"

/**
 * The narrative paragraph. Grounded strictly on the assembled facts — a scouting report that
 * invents a placement is worse than one with no summary at all, so a failure here returns
 * null and the page renders without it rather than guessing.
 */
export async function writeSummary(report: Omit<ScoutingReport, "summary">): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const facts = summaryFacts(report)

  /*
   * Two attempts, then nothing.
   *
   * The model is told to use only the facts, and on a wrestler with no published ranking and no
   * GPA it still wrote "RecruitNC #13 in the Class of 2029 and has a GPA of 3.8". A coach paying
   * for this page cannot be handed invented numbers, and a report with no summary is honest.
   */
  let lastText: string | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await askForSummary(apiKey, facts)
    if (!raw) return null
    // "This season" is forbidden by the prompt and still turns up; the year beside it is
    // already correct, so the framing is cut rather than the sentence discarded.
    const text = stripSeasonFraming(raw)
    const problems = unsupportedSummaryClaims(text, facts)
    if (problems.length === 0) return text
    lastText = text
    console.warn(`[scouting-report] summary discarded, unsupported: ${problems.join(", ")}`)
  }

  // Both attempts invented something. Keep the sentences that did not rather than show nothing.
  const salvaged = lastText ? stripUnsupportedSentences(lastText, facts) : null
  if (salvaged) console.warn("[scouting-report] summary salvaged by dropping unsupported sentences")
  return salvaged
}

async function askForSummary(apiKey: string, facts: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        // gpt-4o-mini turned a loss into a win and invented a state-tournament record on the same
        // facts; gpt-4.1 kept every opponent's accolade and every result straight. A coach reads
        // this paragraph first, so the better model is worth the fraction of a cent.
        model: "gpt-4.1",
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { role: "user", content: facts },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) return null
    const data = await response.json()
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim()
    return text || null
  } catch {
    return null
  }
}
