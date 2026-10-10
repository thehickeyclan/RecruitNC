/**
 * Does this wrestler meet the signed-in coach's perfect recruit? One flag, for the profile.
 *
 * Verified college coaches and admins only; anyone else, and a program with no standard set,
 * gets `flag: null` rather than an error - the profile simply shows nothing.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const athleteId = String(new URL(request.url).searchParams.get("athlete") ?? "").trim()
  const user = await getUserFromRequest(request)
  if (!user || !athleteId) return NextResponse.json({ flag: null, hasStandard: false })
  const admin = createAdminClient()
  const viewer = await resolveFitViewer(admin, user.id)
  if (!viewer.allowed) return NextResponse.json({ flag: null, hasStandard: false })
  if (!viewer.hasStandard) return NextResponse.json({ flag: null, hasStandard: false, canSet: true })
  try {
    const flags = await loadFitFlags(admin, [athleteId], viewer.saved!.criteria, { personal: viewer.personal })
    return NextResponse.json({ flag: flags.get(athleteId) ?? null, hasStandard: true })
  } catch (error) {
    console.error("[program-fit] check failed:", error)
    return NextResponse.json({ flag: null, hasStandard: true })
  }
}
