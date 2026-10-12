import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadCoachProgramLogos } from "@/lib/coach-program-logo"

/**
 * Staff check of the logo each college coach sees on Coach Home (lib/coach-program-logo.ts).
 *
 * GET   - every program with coaches, the logo shown and where it came from.
 * PATCH - { schoolId, action: "remove-upload" } clears a program's uploaded logo, so it falls back
 *         to the site's logo for that school, or to none.
 */
export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  return NextResponse.json(await loadCoachProgramLogos(createAdminClient()))
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = (await request.json().catch(() => ({}))) as { schoolId?: unknown; action?: unknown }
  if (typeof body.schoolId !== "string" || body.action !== "remove-upload") {
    return NextResponse.json({ error: "schoolId and action are required" }, { status: 400 })
  }
  const { error } = await createAdminClient().from("schools").update({ logo_url: null }).eq("id", body.schoolId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
