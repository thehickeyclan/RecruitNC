/**
 * The not-yet-live states this viewer was invited to look at.
 *
 * Sent on its own, like /api/prospects/ranks, rather than added to the profile the auth context
 * loads: `preview_states` is new, and PostgREST refuses an entire select when one column is
 * unknown, so widening the shared profile query would take every page down until the column
 * exists. Here it costs one request that answers an empty list.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { previewStatesForUser } from "@/lib/recruiting/state-preview"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: auth } = await (await createClient()).auth.getUser()
    if (!auth.user) return NextResponse.json({ states: [] }, { headers: { "Cache-Control": "private, no-store" } })
    const states = await previewStatesForUser(createAdminClient(), auth.user.id)
    return NextResponse.json({ states }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ states: [] }, { headers: { "Cache-Control": "private, no-store" } })
  }
}
