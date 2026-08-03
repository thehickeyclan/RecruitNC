import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClientFresh } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClientFresh()
  const { data, error } = await admin
    .from("wrestling_club_submissions")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ submissions: [], unavailable: true })
    }
    console.error("[admin/clubs/submissions]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ submissions: data ?? [] })
}
