/**
 * My Wrestlers on Super 32 HQ for a signed-in user: the same list on the website and inside the
 * app (the app's web sheet is signed in through the hand-off). Its own table, nothing to do with
 * following athletes (Matt, 24 Oct). Signed out: 401, and the page keeps the list on the device.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"

export const dynamic = "force-dynamic"

const validKey = (k: unknown): k is string => typeof k === "string" && k.length > 0 && k.length <= 160

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ signedIn: false, keys: [] }, { status: 401 })
  const { data } = await createAdminClient().from("super32_live_stars").select("star_key").eq("user_id", userId).limit(500)
  return NextResponse.json({ signedIn: true, keys: (data ?? []).map((r) => r.star_key) }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to save your list" }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { add?: unknown[]; remove?: unknown[] } | null
  const add = (body?.add ?? []).filter(validKey).slice(0, 200)
  const remove = (body?.remove ?? []).filter(validKey).slice(0, 200)
  const admin = createAdminClient()
  if (add.length) await admin.from("super32_live_stars").upsert(add.map((k) => ({ user_id: userId, star_key: k })), { onConflict: "user_id,star_key", ignoreDuplicates: true })
  if (remove.length) await admin.from("super32_live_stars").delete().eq("user_id", userId).in("star_key", remove)
  return NextResponse.json({ ok: true })
}
