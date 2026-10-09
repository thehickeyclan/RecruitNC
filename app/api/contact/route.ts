import { NextResponse } from "next/server"
import { sendContactMessage, validateContactMessage } from "@/lib/email/contact-message"

/**
 * Public on purpose: someone who cannot sign in is exactly who needs to reach us.
 * Abuse controls are a honeypot field and a small per-IP window (per instance, which is
 * enough to stop a script hammering one form, not a determined attacker).
 */

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const recent = new Map<string, number[]>()

function tooMany(ip: string): boolean {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  recent.set(ip, hits)
  return hits.length > MAX_PER_WINDOW
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  // Bots fill every field; people never see this one. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, acknowledged: true })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
  if (tooMany(ip)) {
    return NextResponse.json({ error: "Too many messages. Please try again in a few minutes." }, { status: 429 })
  }

  const parsed = validateContactMessage(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const result = await sendContactMessage(parsed.value)
  if (!result.success) {
    return NextResponse.json(
      { error: "We couldn't send your message. Please email info@ncwrestlingunited.com directly." },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true, acknowledged: result.acknowledged })
}
