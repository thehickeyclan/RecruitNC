import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/communities/hub/documents?context_type=event&context_id=nhsca-duals-2026
 * Returns documents for a hub (event or program). User must have access to that hub (e.g. event_workspace_members).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user?.id) {
    return NextResponse.json({ documents: [] })
  }

  const searchParams = request.nextUrl.searchParams
  const contextType = searchParams.get("context_type") ?? "event"
  const contextId = (searchParams.get("context_id") ?? "").trim()
  if (!contextId) {
    return NextResponse.json({ documents: [] })
  }

  // For event hubs: user must be in event_workspace_members or have paid registration
  if (contextType === "event") {
    const admin = createAdminClient()
    const { data: inWorkspace } = await admin
      .from("event_workspace_members")
      .select("user_id")
      .eq("event_slug", contextId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!inWorkspace) {
      const emailLower = (user.email ?? "").toLowerCase()
      const { data: reg } = await admin
        .from("national_team_event_registrations")
        .select("id")
        .eq("status", "paid")
        .ilike("parent_email", emailLower)
        .eq("event_slug", contextId)
        .limit(1)
        .maybeSingle()
      if (!reg) return NextResponse.json({ documents: [] })
    }
  }

  try {
    const admin = createAdminClient()
    const { data: rows } = await admin
      .from("hub_documents")
      .select("id, file_url, name, content_type, uploaded_at")
      .eq("context_type", contextType)
      .eq("context_id", contextId)
      .order("uploaded_at", { ascending: false })
    return NextResponse.json({ documents: rows ?? [] })
  } catch {
    return NextResponse.json({ documents: [] })
  }
}
