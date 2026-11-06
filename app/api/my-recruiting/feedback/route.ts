import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { notifyStaffFamilyFeedback } from "@/lib/staff-alerts-sms"

export const dynamic = "force-dynamic"

const RATINGS = new Set(["great", "good", "needs_work"])

/**
 * Feedback from the Command Center home (components/portal/family-feedback.tsx). Staff get it by
 * text straight away; it is also kept, once the table exists (Supabase SQL Editor):
 *
 * create table if not exists public.family_feedback (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null,
 *   athlete_id uuid,
 *   rating text,
 *   message text,
 *   page text,
 *   created_at timestamptz not null default now()
 * );
 * alter table public.family_feedback enable row level security;
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const rating = typeof body.rating === "string" && RATINGS.has(body.rating) ? body.rating : null
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : ""
  if (!rating && message.length < 3) return NextResponse.json({ error: "Pick one or write a note." }, { status: 400 })
  const athleteId = typeof body.athleteId === "string" && /^[0-9a-f-]{36}$/i.test(body.athleteId) ? body.athleteId : null
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : null

  const admin = createAdminClient()
  const [{ data: me }, { data: a }] = await Promise.all([
    admin.from("user_profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
    athleteId ? admin.from("athletes").select('"firstName", "lastName", state').eq("id", athleteId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const { error } = await admin.from("family_feedback").insert({ user_id: user.id, athlete_id: athleteId, rating, message: message || null, page })
  if (error) console.error("[family-feedback] not stored (the text still goes):", error.message)

  const who = String(me?.full_name ?? "").trim() || String(me?.email ?? user.email ?? "A family")
  const wrestler = a ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() + (a.state ? `, ${a.state}` : "") : null
  await notifyStaffFamilyFeedback({ who, wrestler, rating, message }).catch(() => 0)
  return NextResponse.json({ ok: true })
}
