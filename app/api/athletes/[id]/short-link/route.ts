import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { shortLinkPathFor } from "@/lib/profile-short-link-server"

/**
 * The profile's short link, "/w/xavier-bernthal-2029", for the share button
 * (lib/profile-short-link.ts). Public, like the profile it points at: it carries only the name
 * and class the profile already shows.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const path = await shortLinkPathFor(createAdminClient(), id).catch(() => null)
  if (!path) return NextResponse.json({ error: "No short link" }, { status: 404 })
  return NextResponse.json({ path }, { headers: { "Cache-Control": "public, max-age=300" } })
}
