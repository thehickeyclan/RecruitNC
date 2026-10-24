/**
 * "Watching now" on Super 32 HQ. Each open page checks in every 45 seconds with a random session id
 * (no account, no personal data); a session counts while it checked in within the last 2 minutes.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const WINDOW_MS = 120_000

async function watching(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count } = await admin
    .from("super32_live_presence")
    .select("session_id", { count: "exact", head: true })
    .gte("last_seen", new Date(Date.now() - WINDOW_MS).toISOString())
  return count ?? 0
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { sid?: string } | null
  const sid = String(body?.sid ?? "").trim()
  if (!/^[a-z0-9-]{8,64}$/i.test(sid)) return NextResponse.json({ watching: null }, { status: 400 })
  const admin = createAdminClient()
  await admin.from("super32_live_presence").upsert({ session_id: sid, last_seen: new Date().toISOString() }, { onConflict: "session_id" })
  // Keep the table small: now and then, drop sessions gone for a day.
  if (Math.random() < 0.02) {
    await admin.from("super32_live_presence").delete().lt("last_seen", new Date(Date.now() - 86_400_000).toISOString())
  }
  return NextResponse.json({ watching: await watching(admin) }, { headers: { "Cache-Control": "no-store" } })
}
