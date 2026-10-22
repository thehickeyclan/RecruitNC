import { stripUnsupportedSentences, unsupportedSummaryClaims } from "@/lib/scouting-report"
import type { AthleteEventReport } from "@/lib/coach-event-report"

/**
 * A short written summary for each wrestler in the coach event report (Matt, 22 Oct 2026: "ai
 * summaries"). The report itself stays computed; this only restates its facts in two or three
 * sentences, and is checked against them by the scouting report's own guard. When it cannot be
 * trusted the wrestler gets no summary: the computed card says everything already.
 */

const PRAISE = /\b(impressive|dominant|dominat\w*|strong|outstanding|elite|stellar|this season)\b/i

const PROMPT = `You write two or three sentences for a college wrestling coach about one wrestler's results at one tournament.
Use only the facts given. Never add a result, score, ranking, round, school, place or credential that is not in them.
If the facts say the finish is not a place at the tournament, do not call it a place.
Lead with the finish and record. Name the best wins with the opponent's name and credential written into the sentence ("beat Micah Engelman, a 2026 NHSCA All-American, 6-4"). Mention a loss to a credentialed opponent when one is listed.
Use the pronoun given; if none is given, use the wrestler's surname. No praise words, no predictions, no "this season", no square brackets.`

export function reportFacts(r: AthleteEventReport, eventName: string, lossesVisible: boolean): string {
  const pronoun = /^f/i.test(r.gender ?? "") ? "she" : /^m/i.test(r.gender ?? "") ? "he" : null
  return [
    `Wrestler: ${r.name}${pronoun ? ` (${pronoun})` : ""}, ${[r.classYear ? `Class of ${r.classYear}` : null, r.school].filter(Boolean).join(", ")}`,
    `Event: ${eventName}`,
    `Weight: ${r.weight ?? "not recorded"}`,
    `Record at the event: ${r.record.wins}-${r.record.losses}`,
    `Finish: ${r.placement ?? "no place at the tournament"}${r.placementNote ? ` (${r.placementNote})` : ""}`,
    r.strength ? `Strength of Competition: ${r.strength.grade}, ${r.strength.line}` : null,
    ...r.significantWins.map((w) => `Significant win: beat ${w.opponent}${w.opponentSchool ? ` of ${w.opponentSchool}` : ""}${w.result ? `, ${w.result}` : ""}; opponent: ${w.credential ?? "no credential"}`),
    ...(lossesVisible ? r.notableLosses.map((l) => `Notable loss: lost to ${l.opponent}${l.opponentSchool ? ` of ${l.opponentSchool}` : ""}${l.result ? `, ${l.result}` : ""}; opponent: ${l.credential ?? "no credential"}`) : []),
    ...r.bouts.map((b) => `Bout (${b.round || "round not given"}${b.bracket ? `, ${b.bracket}` : ""}): ${b.outcome === "W" ? "beat" : "lost to"} ${b.opponent}${b.opponentClub ? ` of ${b.opponentClub}` : ""}${[b.method, b.score].filter(Boolean).length ? `, ${[b.method, b.score].filter(Boolean).join(" ")}` : ""}`),
  ]
    .filter(Boolean)
    .join("\n")
}

export async function writeReportSummary(r: AthleteEventReport, eventName: string, lossesVisible: boolean): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !r.competed) return null
  const facts = reportFacts(r, eventName, lossesVisible)
  let last: string | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        // gpt-4.1, as the scouting report: gpt-4o-mini turned a loss into a win on the same facts.
        body: JSON.stringify({ model: "gpt-4.1", temperature: 0.2, max_tokens: 220, messages: [{ role: "system", content: PROMPT }, { role: "user", content: facts }] }),
      })
      if (!res.ok) return null
      const text = String(((await res.json()) as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? "").trim()
      if (!text) return null
      // No place at the tournament: a sentence may name the bracket finish only as what it is.
      const placeClaim = !r.place && /\b(placed|finished (1st|2nd|3rd|\d+th)|champion|runner-up)\b/i.test(text) && !/lower[- ]tier|not a (tournament )?place|overflow/i.test(text)
      if (PRAISE.test(text) || /[[\]]/.test(text) || placeClaim) {
        last = null
        continue
      }
      if (unsupportedSummaryClaims(text, facts).length === 0) return text
      last = text
    } catch {
      return null
    }
  }
  return last ? stripUnsupportedSentences(last, facts) : null
}
