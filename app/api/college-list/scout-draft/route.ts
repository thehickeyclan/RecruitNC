import { NextResponse, type NextRequest } from "next/server"

import data from "@/lib/college-programs/programs-2026-27.json"
import { OUTREACH_KINDS, OUTREACH_KIND_LABEL, type OutreachKind } from "@/lib/college-programs/outreach-templates"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { buildScoutContext } from "@/lib/recruiting/scout/context"
import { askScout } from "@/lib/recruiting/scout/run"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { siteFromRequest } from "@/lib/analytics-site"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const DAILY_LIMIT = 80
const NAMES = new Map((data.schools as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]))

/**
 * Scout writes the coach email in the email form (Matt, 23 Oct 2026: "why not have scout be in
 * that form to write the email?"). The form's own draft goes in as the facts to keep - verified
 * results, schedule, the family's reason - and Scout rewrites it in the wrestler's voice. Its
 * draft rules run in code (draftProblems): no praise of the program, no roster talk, no "what would
 * you like to see", no questionnaire claimed that is not done. The family reads and edits it before
 * anything is sent; nothing is sent from here.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase, admin })
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  if (!hasPortalAccess(viewer)) return NextResponse.json({ error: "Scout is part of the Recruiting Command Center." }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Scout is not available right now." }, { status: 503 })

  const body = (await request.json().catch(() => ({}))) as { schoolId?: unknown; kind?: unknown; why?: unknown; detail?: unknown; draft?: unknown }
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : ""
  const name = NAMES.get(schoolId)
  const kind = OUTREACH_KINDS.includes(body.kind as OutreachKind) ? (body.kind as OutreachKind) : "intro"
  const draft = typeof body.draft === "string" ? body.draft.slice(0, 4000) : ""
  if (!name || !draft) return NextResponse.json({ error: "Nothing to write from yet." }, { status: 400 })
  const why = typeof body.why === "string" ? body.why.trim().slice(0, 400) : ""
  const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 600) : ""

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin.from("user_analytics").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "scout_question").gte("created_at", since)
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: "That's today's Scout limit. The draft below is still yours to send." }, { status: 429 })

  const question = [
    `Write the "${OUTREACH_KIND_LABEL[kind]}" email to the coaching staff at ${name} [link: school:${schoolId}], in the wrestler's own voice.`,
    "Keep every result, place, weight, date, event and contact detail exactly as in the draft below; add no fact that is not in it or in your lookups. Short: four or five short paragraphs at most.",
    why ? `The family's reason for this college, in their words: "${why}".` : "",
    detail ? `What the family wants to say: "${detail}".` : "",
    "Return it as the draft. The draft to rewrite:",
    "---",
    draft,
    "---",
  ]
    .filter(Boolean)
    .join("\n")

  const context = await buildScoutContext(admin, userId)
  const started = Date.now()
  const answer = await askScout(context, question, [])
  await admin
    .from("user_analytics")
    .insert({ user_id: userId, event_type: "scout_question", page_url: "/email-composer", event_data: { kind, site: siteFromRequest(request), ms: Date.now() - started, timestamp: new Date().toISOString() } })
    .then(() => null, () => null)
  if (!answer?.draft?.body) return NextResponse.json({ error: "Scout couldn't write it just now. The draft below is still ready to send." }, { status: 502 })
  return NextResponse.json({ subject: answer.draft.subject, body: answer.draft.body })
}
