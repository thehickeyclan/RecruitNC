import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
const STATUSES = new Set(["contact", "invited", "registered", "confirmed", "declined"])

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { data, error } = await createAdminClient().from("toc_college_coaches").select("*").order("created_at", { ascending: false }).limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ coaches: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await request.json()
  const contacts = Array.isArray(body.contacts) ? body.contacts.slice(0, 2000) : []
  const rows = contacts.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return []
    const raw = item as Record<string, unknown>
    const coachName = String(raw.coachName ?? "")
      .trim()
      .slice(0, 160)
    const collegeProgram = String(raw.collegeProgram ?? "")
      .trim()
      .slice(0, 200)
    const email = String(raw.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 320)
    const mobilePhone =
      String(raw.mobilePhone ?? "")
        .trim()
        .slice(0, 40) || null
    if (!coachName || !collegeProgram || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return []
    return [
      {
        coach_name: coachName,
        college_program: collegeProgram,
        email,
        mobile_phone: mobilePhone,
        source: "import",
        updated_at: new Date().toISOString(),
      },
    ]
  })
  if (rows.length === 0) return NextResponse.json({ error: "No valid contacts found" }, { status: 400 })
  const deduped = [...new Map(rows.map((row) => [row.email, row])).values()]
  const { error } = await createAdminClient().from("toc_college_coaches").upsert(deduped, { onConflict: "email", ignoreDuplicates: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, imported: deduped.length })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await request.json()
  const id = String(body.id ?? "")
  const status = String(body.status ?? "")
  if (!id || !STATUSES.has(status)) return NextResponse.json({ error: "Invalid update" }, { status: 400 })
  const { error } = await createAdminClient().from("toc_college_coaches").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
