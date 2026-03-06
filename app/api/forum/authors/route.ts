import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/forum/authors?ids=uuid1,uuid2,...
 * Returns display_name and headshot_url for each user_id. Used for message avatars and names in Community.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const idsParam = request.nextUrl.searchParams.get("ids")?.trim()
  if (!idsParam) {
    return NextResponse.json({ authors: {} })
  }

  const ids = [...new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean))]
  if (ids.length === 0) {
    return NextResponse.json({ authors: {} })
  }

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from("user_profiles")
    .select("user_id, full_name, first_name, last_name, email, headshot_url")
    .in("user_id", ids)

  const authors: Record<string, { display_name: string; headshot_url: string | null }> = {}
  for (const row of rows ?? []) {
    const r = row as { user_id: string; full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null; headshot_url?: string | null }
    const displayName =
      r.full_name?.trim() ||
      [r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
      r.email ||
      "Member"
    authors[r.user_id] = {
      display_name: displayName,
      headshot_url: r.headshot_url ?? null,
    }
  }

  return NextResponse.json({ authors })
}
