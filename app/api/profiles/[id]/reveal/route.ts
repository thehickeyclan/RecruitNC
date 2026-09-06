import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildProfileReveal, profileGaps } from "@/lib/profile-reveal"

/**
 * What we already know about a wrestler, for the claim step of profile creation.
 *
 * Competition facts only. This is reachable before anyone proves they own the profile, so it
 * returns nothing the public profile would not already show — no contact details, no
 * academics. The gap list names which fields are empty, never their values.
 */

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: athlete, error } = await admin.from("athletes").select("*").eq("id", id).maybeSingle()
  if (error || !athlete) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  const reveal = await buildProfileReveal(admin, athlete as Record<string, unknown>)
  return NextResponse.json({ reveal, gaps: profileGaps(athlete as Record<string, unknown>) })
}
