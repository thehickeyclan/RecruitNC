import "server-only"

import type { ScoutContext, ScoutLink } from "@/lib/recruiting/scout/context"
import { SCOUT_SYSTEM } from "@/lib/recruiting/scout/prompt"
import { SCOUT_TOOLS, runScoutTool } from "@/lib/recruiting/scout/tools"

export type ScoutDraft = { to: string[]; subject: string; body: string }
export type ScoutAnswer = { headline: string; body: string; links: ScoutLink[]; draft: ScoutDraft | null }
type Turn = { role: "user" | "assistant"; content: string }

const MAX_ROUNDS = 5

/**
 * What a draft to a coach must never say, checked in code (a prompt rule alone did not hold: the
 * first drafts praised a "strong wrestling program" and pointed out "room at my weight").
 */
export function draftProblems(body: string, questionnaireNotDone: boolean): string[] {
  const out: string[] = []
  if (/\b(strong|great|excellent|prestigious|renowned|elite|top-notch|storied|rich|impressive|successful|outstanding|proud|tradition)\b/i.test(body))
    out.push("Remove the praise of the program; say why this college with a fact from the lookup instead.")
  if (/\b(room|opening|openings|spot|need|needs|gap)\b.{0,40}\bweight\b|\broster\b|\bfinal year\b|\bgraduating\b|\bdepth\b/i.test(body))
    out.push("Do not mention room, openings or needs on their roster.")
  if (/\b(close to home|near(by)? (to )?(my )?home|short drive|not far from)\b/i.test(body)) out.push("We do not know where the family lives: do not say the college is close to home.")
  if (questionnaireNotDone && /\b(completed|filled out|filled in|submitted|done)\b.{0,40}questionnaire|questionnaire.{0,20}\b(completed|done|submitted)\b/i.test(body))
    out.push("The questionnaire is not recorded as done: do not say it is.")
  return out
}
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
  | { role: "tool"; tool_call_id: string; content: string }

/**
 * One question to Scout: the model may look colleges up (tools.ts) for a few rounds, then answers
 * in JSON. Everything it returns is checked here - links must be ones it was handed, and an email
 * draft may only be addressed to coach emails a lookup returned.
 */
export async function askScout(context: ScoutContext, question: string, history: Turn[]): Promise<ScoutAnswer | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const messages: Message[] = [
    { role: "system", content: SCOUT_SYSTEM },
    { role: "system", content: `# Facts\n${context.facts}` },
    ...history,
    { role: "user", content: question },
  ]
  // Every email address a lookup showed: the only ones a draft may go to.
  const seenEmails = new Set<string>()
  let questionnaireNotDone = false
  let retried = false

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.SCOUT_MODEL || "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        tools: SCOUT_TOOLS,
        // The last round must answer.
        tool_choice: round === MAX_ROUNDS - 1 ? "none" : "auto",
        messages,
      }),
      signal: AbortSignal.timeout(40_000),
    }).catch(() => null)
    if (!res?.ok) {
      console.error("[scout]", res?.status, res ? (await res.text().catch(() => "")).slice(0, 300) : "no response")
      return null
    }
    const json = (await res.json().catch(() => null)) as { choices?: Array<{ message?: Extract<Message, { role: "assistant" }> }> } | null
    const message = json?.choices?.[0]?.message
    if (!message) return null
    if (message.tool_calls?.length) {
      messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls })
      for (const call of message.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments || "{}")
        } catch {
          args = {}
        }
        const out = await runScoutTool(context.session, call.function.name, args).catch((e: unknown) => `The lookup failed: ${e instanceof Error ? e.message : String(e)}`)
        for (const email of out.match(EMAIL) ?? []) seenEmails.add(email.toLowerCase())
        if (/NOT recorded the questionnaire/.test(out)) questionnaireNotDone = true
        messages.push({ role: "tool", tool_call_id: call.id, content: out.slice(0, 12_000) })
      }
      continue
    }
    const answer = parseAnswer(message.content ?? "", context, seenEmails)
    const problems = [
      ...(answer?.draft ? draftProblems(answer.draft.body, questionnaireNotDone) : []),
      // The family's income is never known: a net price is an average, not theirs.
      ...(answer && /\byour income\b/i.test(`${answer.headline} ${answer.body}`) ? ["We do not know the family's income: call the net price an average for aided students."] : []),
    ]
    if (answer && problems.length && !retried && round < MAX_ROUNDS - 1) {
      // One rewrite, told exactly what to fix.
      retried = true
      messages.push({ role: "assistant", content: message.content ?? "" })
      messages.push({
        role: "user",
        content: `Fix this and return the full JSON again (keep "draft" null unless I asked for an email):\n- ${problems.join("\n- ")}`,
      })
      continue
    }
    return answer
  }
  return null
}

function parseAnswer(raw: string, context: ScoutContext, seenEmails: Set<string>): ScoutAnswer | null {
  let parsed: { headline?: unknown; body?: unknown; links?: unknown; draft?: unknown } = {}
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : ""
  if (!headline) return null
  const links = (Array.isArray(parsed.links) ? parsed.links : [])
    .filter((k): k is string => typeof k === "string")
    .map((k) => context.links[k])
    .filter((l): l is ScoutLink => Boolean(l))
    .filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i)
    .slice(0, 3)
  let draft: ScoutDraft | null = null
  const d = parsed.draft as { to?: unknown; subject?: unknown; body?: unknown } | null | undefined
  if (d && typeof d.body === "string" && d.body.trim()) {
    draft = {
      to: (Array.isArray(d.to) ? d.to : []).filter((e): e is string => typeof e === "string" && seenEmails.has(e.trim().toLowerCase())).map((e) => e.trim()),
      subject: typeof d.subject === "string" ? d.subject.trim() : "",
      body: d.body.trim(),
    }
  }
  return { headline, body: typeof parsed.body === "string" ? parsed.body.trim() : "", links, draft }
}
