import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { summarizeEvent } from "@/lib/national-results-from-bouts"
import { stripUnsupportedSentences, unsupportedSummaryClaims } from "@/lib/scouting-report"
import { loadSignificantOpponentIndex } from "@/lib/significant-opponent-index"
import { accoladeLineWithRank, findSignificantLosses, findSignificantWins, type Bout, type OpponentIndex } from "@/lib/significant-wins"

/**
 * One event, one coach's wrestlers (Matt, 22 Oct 2026: the Super 32 report promised to coaches
 * within 24 hours of the finals). Everything a coach reads is computed from the event's bouts by
 * the code profiles use: record and finish (summarizeEvent), each opponent's credentials and the
 * significant wins and notable losses (findSignificantWins/Losses on the same opponent index).
 * The AI summary only restates those facts and is checked against them; when it cannot be, the
 * wrestler gets the computed sentence instead.
 */

export type EventBout = { opponent: string; opponentSchool: string | null; win: boolean; result: string | null; round: string | null; credential: string | null }
export type EventResultCard = {
  id: string
  name: string
  firstName: string
  photo: string | null
  school: string | null
  state: string | null
  classYear: number | null
  gender: string | null
  competed: boolean
  weight: string | null
  record: string | null
  wins: number
  losses: number
  placement: number | null
  bouts: EventBout[]
  significantWins: EventBout[]
  notableLosses: EventBout[]
  /** One computed sentence: what happened, never more. */
  line: string
}

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
const placeLabel = (p: number | null) => (p === 1 ? "Champion" : p === 2 ? "Runner-up" : p ? `${ordinal(p)} place` : null)
const resultOf = (b: { win_type?: string | null; score?: string | null }) => [b.win_type, b.score].filter(Boolean).join(" ") || null

type Row = {
  athlete_id: string
  opponent_name: string | null
  opponent_club: string | null
  win: boolean | null
  is_bye: boolean | null
  win_type: string | null
  score: string | null
  round: string | null
  weight_class: string | null
  bout_order: number | null
  event_name: string | null
  event_date: string | null
  year: number | null
}

/** The event's cards for these wrestlers, competed first (by finish, then record), then the rest. */
export async function loadEventReport(
  admin: SupabaseClient,
  athleteIds: string[],
  eventKey: string,
  options: { index?: OpponentIndex } = {},
): Promise<{ eventName: string | null; cards: EventResultCard[] }> {
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (!ids.length) return { eventName: null, cards: [] }
  const [{ data: people }, rows, index] = await Promise.all([
    admin.from("athletes").select('id, name, "firstName", photourl, highschool, state, is_nc_athlete, graduationyear, gender').in("id", ids),
    (async () => {
      const out: Row[] = []
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await admin
          .from("other_tournament_bouts")
          .select("athlete_id, opponent_name, opponent_club, win, is_bye, win_type, score, round, weight_class, bout_order, event_name, event_date, year")
          .eq("event_key", eventKey)
          .in("athlete_id", ids.slice(i, i + 200))
          .order("bout_order", { ascending: true })
        out.push(...((data ?? []) as Row[]))
      }
      return out
    })(),
    options.index ? Promise.resolve(options.index) : loadSignificantOpponentIndex(admin),
  ])
  const eventName = rows.find((r) => r.event_name)?.event_name ?? null
  const byAthlete = new Map<string, Row[]>()
  for (const r of rows) byAthlete.set(r.athlete_id, [...(byAthlete.get(r.athlete_id) ?? []), r])

  const cards: EventResultCard[] = (people ?? []).map((p) => {
    const mine = (byAthlete.get(String(p.id)) ?? []).filter((r) => !r.is_bye && r.opponent_name)
    const first = String(p.firstName ?? "").trim() || String(p.name ?? "").split(" ")[0]
    const base = {
      id: String(p.id),
      name: String(p.name ?? ""),
      firstName: first,
      photo: (p.photourl as string | null) ?? null,
      school: (p.highschool as string | null) ?? null,
      state: p.is_nc_athlete ? "NC" : ((p.state as string | null) ?? null),
      classYear: p.graduationyear ? Number(p.graduationyear) : null,
      gender: (p.gender as string | null) ?? null,
    }
    if (!mine.length) {
      return { ...base, competed: false, weight: null, record: null, wins: 0, losses: 0, placement: null, bouts: [], significantWins: [], notableLosses: [], line: `${first} did not compete at ${eventName ?? "this event"}.` }
    }
    const summary = summarizeEvent(mine)
    // The finder's Bout shape; the event's date puts every bout in the right season.
    const asBouts: Bout[] = mine.map((r) => ({
      opponent: r.opponent_name,
      opponent_school: r.opponent_club,
      win_loss: r.win ? "W" : "L",
      result: resultOf(r),
      date: r.event_date ?? (r.year ? `${r.year}-10-25` : null),
      venue: r.event_name,
      weight: r.weight_class,
    }))
    const wins = findSignificantWins(asBouts, index)
    const losses = findSignificantLosses(asBouts, index)
    const credentialOf = new Map<string, string>()
    for (const w of [...wins, ...losses]) {
      const line = accoladeLineWithRank(w)
      if (line) credentialOf.set(w.opponent.toLowerCase(), line)
    }
    const bouts: EventBout[] = mine.map((r) => ({
      opponent: String(r.opponent_name),
      opponentSchool: r.opponent_club,
      win: Boolean(r.win),
      result: resultOf(r),
      round: r.round,
      credential: credentialOf.get(String(r.opponent_name).toLowerCase()) ?? null,
    }))
    const sig = bouts.filter((b) => b.win && b.credential)
    const notable = bouts.filter((b) => !b.win && b.credential)
    const finish = placeLabel(summary.placement)
    const line = [
      `${first} went ${summary.record}${summary.weight ? ` at ${summary.weight}` : ""}${finish ? `, ${finish.toLowerCase()}` : ""}.`,
      sig.length ? `${sig.length === 1 ? "A win" : `${sig.length} wins`} over ${sig.map((b) => `${b.opponent} (${b.credential})`).join(", ")}.` : null,
    ]
      .filter(Boolean)
      .join(" ")
    return { ...base, competed: true, weight: summary.weight, record: summary.record, wins: summary.wins, losses: summary.losses, placement: summary.placement, bouts, significantWins: sig, notableLosses: notable, line }
  })
  cards.sort((a, b) => Number(b.competed) - Number(a.competed) || (a.placement ?? 99) - (b.placement ?? 99) || b.wins - a.wins || a.name.localeCompare(b.name))
  return { eventName, cards }
}

/** The facts the AI summary may use, one per line, exactly as the card shows them. */
export function eventFacts(card: EventResultCard, eventName: string): string {
  const pronoun = /^f/i.test(card.gender ?? "") ? "she" : /^m/i.test(card.gender ?? "") ? "he" : null
  return [
    `Wrestler: ${card.name}${pronoun ? ` (${pronoun})` : ""}, ${[card.classYear ? `Class of ${card.classYear}` : null, card.school, card.state].filter(Boolean).join(", ")}`,
    `Event: ${eventName}`,
    `Weight: ${card.weight ?? "unknown"}`,
    `Record at the event: ${card.record}`,
    `Finish: ${placeLabel(card.placement) ?? "did not place"}`,
    ...card.bouts.map((b) => `Bout (${b.round ?? "round not given"}): ${b.win ? "beat" : "lost to"} ${b.opponent}${b.opponentSchool ? ` of ${b.opponentSchool}` : ""}${b.result ? `, ${b.result}` : ""}${b.credential ? ` [opponent: ${b.credential}]` : ""}`),
  ].join("\n")
}

const SUMMARY_PROMPT = `You write two or three sentences for a college wrestling coach about one wrestler's results at one tournament.
Use only the facts given. Never add a result, score, ranking, round, school or credential that is not in them. If the wrestler did not place, say so plainly.
Lead with the finish and record. Name the best wins with the opponent's name and credential written into the sentence ("beat Micah Engelman, a 2026 NHSCA All-American, 6-4"); never copy the square brackets. Mention a loss to a credentialed opponent when there is one.
Use the pronoun given; if none is given, use the wrestler's surname. No praise words ("impressive", "dominant", "strong"), no predictions, no "this season".`

/** The AI summary, checked against the facts; the computed line when it cannot be trusted. */
export async function writeEventSummary(card: EventResultCard, eventName: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !card.competed) return card.line
  const facts = eventFacts(card, eventName)
  let last: string | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4.1", temperature: 0.2, max_tokens: 220, messages: [{ role: "system", content: SUMMARY_PROMPT }, { role: "user", content: facts }] }),
      })
      if (!res.ok) return card.line
      const text = String(((await res.json()) as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? "").trim()
      if (!text) return card.line
      if (/\b(impressive|dominant|dominat|strong|outstanding|elite|this season)\b/i.test(text)) {
        last = text
        continue
      }
      if (/[\[\]]/.test(text)) {
        last = text.replace(/\s*\[([^\]]*)\]/g, ", $1,").replace(/,\s*([.,])/g, "$1")
        continue
      }
      if (unsupportedSummaryClaims(text, facts).length === 0) return text
      last = text
    } catch {
      return card.line
    }
  }
  return (last && stripUnsupportedSentences(last, facts)) || card.line
}
