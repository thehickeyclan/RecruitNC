/**
 * POST: Fix 2026 NCHSAA placement in the database.
 * Use when the Blue list (or profile) shows SQ but the wrestler actually placed 2nd/3rd/4th.
 * The app only reads from wrestling_nchsaa_results — if the row has place=0, we show SQ.
 * Body: { wrestler_name: string, classification: string, weight_class: string, place: number (1-4) }
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { wrestler_name?: string; classification?: string; weight_class?: string; place?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const wrestler_name = (body.wrestler_name ?? "").toString().trim()
  const classification = (body.classification ?? "").toString().trim()
  const weight_class = (body.weight_class ?? "").toString().trim()
  const place = body.place != null ? Number(body.place) : null

  if (!wrestler_name || !classification || !weight_class) {
    return NextResponse.json(
      { error: "wrestler_name, classification, and weight_class are required" },
      { status: 400 }
    )
  }
  if (place == null || place < 1 || place > 4) {
    return NextResponse.json({ error: "place must be 1, 2, 3, or 4" }, { status: 400 })
  }

  const admin = createAdminClient()

  const namePattern = `%${wrestler_name.replace(/\s+/g, "%")}%`
  const { data: rows, error: selectError } = await admin
    .from("wrestling_nchsaa_results")
    .select("year, classification, weight_class, wrestler_name, place")
    .eq("year", 2026)
    .eq("classification", classification)
    .eq("weight_class", weight_class)
    .ilike("wrestler_name", namePattern)

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }
  if (!rows?.length) {
    return NextResponse.json(
      { error: "No 2026 row found for that wrestler/classification/weight. Add the placer row in Supabase or run your insert script." }
    )
  }

  const { error: updateError } = await admin
    .from("wrestling_nchsaa_results")
    .update({ place })
    .eq("year", 2026)
    .eq("classification", classification)
    .eq("weight_class", weight_class)
    .ilike("wrestler_name", namePattern)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Updated place to ${place} for ${rows.length} row(s). Refresh the Blue members 2026 page.`,
    matched: rows.length,
  })
}
