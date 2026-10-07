/**
 * A program's recruiting needs - read and saved by its own staff.
 *
 * Verified college coaches and admins only: the needs are a program's recruiting plan, and the
 * comparison checks GPA and test scores against them, which only those viewers may see.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { classifyViewer } from "@/lib/viewer-role"
import { sanitizeCriteria } from "@/lib/program-fit"
import { loadProgramFit, resolveProgramScope, saveProgramFit } from "@/lib/program-fit-store"

export const dynamic = "force-dynamic"

async function coach(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: NextResponse.json({ error: "Sign in to set your program's needs." }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", user.id)
    .maybeSingle()
  const viewer = classifyViewer(profile ?? null)
  const isAdmin = viewer.kind === "admin" || profile?.is_admin === true
  if (!isAdmin && !(viewer.isCollegeCoach && viewer.verifiedCoach)) {
    return { error: NextResponse.json({ error: "Program fit is for verified college coaches." }, { status: 403 }) }
  }
  return { admin, userId: user.id }
}

export async function GET(request: NextRequest) {
  const c = await coach(request)
  if ("error" in c) return c.error
  const saved = await loadProgramFit(c.admin, await resolveProgramScope(c.admin, c.userId))
  return NextResponse.json({ programFit: saved })
}

export async function PUT(request: NextRequest) {
  const c = await coach(request)
  if ("error" in c) return c.error
  const body = await request.json().catch(() => ({}))
  try {
    const saved = await saveProgramFit(c.admin, await resolveProgramScope(c.admin, c.userId), sanitizeCriteria(body?.criteria))
    return NextResponse.json({ programFit: saved })
  } catch (error) {
    console.error("[program-fit] save failed:", error)
    return NextResponse.json({ error: "Could not save your program's needs." }, { status: 500 })
  }
}
