import { NextResponse, type NextRequest } from "next/server"

import { hasPortalAccess } from "@/lib/ranking-visibility"
import { buildScoutContext, type ScoutLink } from "@/lib/recruiting/scout/context"
import { SCOUT_SYSTEM } from "@/lib/recruiting/scout/prompt"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Questions a family may ask in a day: generous for a real family, a ceiling for a runaway script. */
const DAILY_LIMIT = 80
const MAX_TURNS = 6

type Turn = { role: "user" | "assistant"; content: string }
export type ScoutAnswer = { headline: string; body: string; links: ScoutLink[] }

/**
 * Scout, the Recruiting Command Center's recruiting assistant (17 Oct 2026). Command Center, Blue
 * and admin only. The facts are rebuilt for each question (context.ts); the model writes the words
 * and picks links, and only links from the facts survive.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase, admin })
  if (!userId) return NextResponse.json({ error: "Sign in to ask Scout." }, { status: 401 })
  if (!hasPortalAccess(viewer)) return NextResponse.json({ error: "Scout is part of the Recruiting Command Center.", upgrade: "/command-center" }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { question?: unknown; history?: unknown }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 600) : ""
  if (!question) return NextResponse.json({ error: "Ask a question." }, { status: 400 })
  const history: Turn[] = (Array.isArray(body.history) ? body.history : [])
    .filter((t): t is Turn => Boolean(t) && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 1200) }))

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin.from("user_analytics").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "scout_question").gte("created_at", since)
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: "That's today's questions. Scout will be back tomorrow." }, { status: 429 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Scout is not available right now." }, { status: 503 })

  const context = await buildScoutContext(admin, userId)
  const started = Date.now()
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.SCOUT_MODEL || "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCOUT_SYSTEM },
        { role: "system", content: `# Facts\n${context.facts}` },
        ...history,
        { role: "user", content: question },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }) as unknown as Response)
  if (!res.ok) {
    console.error("[scout]", res.status, (await res.text().catch(() => "")).slice(0, 300))
    return NextResponse.json({ error: "Scout couldn't answer just now. Try again in a moment." }, { status: 502 })
  }
  const json = (await res.json().catch(() => null)) as { choices?: Array<{ message?: { content?: string } }> } | null
  let parsed: { headline?: unknown; body?: unknown; links?: unknown } = {}
  try {
    parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}")
  } catch {
    parsed = {}
  }
  const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : ""
  if (!headline) return NextResponse.json({ error: "Scout couldn't answer just now. Try again in a moment." }, { status: 502 })
  // Only links Scout was handed: a made-up path never reaches the page.
  const links = (Array.isArray(parsed.links) ? parsed.links : [])
    .filter((k): k is string => typeof k === "string")
    .map((k) => context.links[k])
    .filter((l): l is ScoutLink => Boolean(l))
    .filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i)
    .slice(0, 3)
  const answer: ScoutAnswer = { headline, body: typeof parsed.body === "string" ? parsed.body.trim() : "", links }

  // Counted for the daily limit and for usage; the question's words are not stored.
  await admin
    .from("user_analytics")
    .insert({ user_id: userId, event_type: "scout_question", page_url: "/my-recruiting/scout", event_data: { chars: question.length, ms: Date.now() - started, timestamp: new Date().toISOString() } })
    .then(() => null, () => null)

  return NextResponse.json(answer)
}
