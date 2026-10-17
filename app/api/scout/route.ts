import { NextResponse, type NextRequest } from "next/server"

import { hasPortalAccess } from "@/lib/ranking-visibility"
import { buildScoutContext } from "@/lib/recruiting/scout/context"
import { askScout } from "@/lib/recruiting/scout/run"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/** Questions a family may ask in a day: generous for a real family, a ceiling for a runaway script. */
const DAILY_LIMIT = 80
const MAX_TURNS = 6

type Turn = { role: "user" | "assistant"; content: string }

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

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Scout is not available right now." }, { status: 503 })

  const context = await buildScoutContext(admin, userId)
  const started = Date.now()
  const answer = await askScout(context, question, history)
  if (!answer) return NextResponse.json({ error: "Scout couldn't answer just now. Try again in a moment." }, { status: 502 })

  // Counted for the daily limit and for usage; the question's words are not stored.
  await admin
    .from("user_analytics")
    .insert({ user_id: userId, event_type: "scout_question", page_url: "/my-recruiting/scout", event_data: { chars: question.length, ms: Date.now() - started, timestamp: new Date().toISOString() } })
    .then(() => null, () => null)

  return NextResponse.json(answer)
}
