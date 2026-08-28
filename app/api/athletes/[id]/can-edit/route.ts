import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ canEdit: false })
    }

    // Get athlete data
    const { data: athlete, error } = await supabase
      .from("athletes")
      .select("claimed_by_user_id")
      .eq("id", id)
      .single()

    if (error || !athlete) {
      return NextResponse.json({ canEdit: false })
    }

    // Whoever claimed the profile can edit it — and so can a parent linked to that athlete.
    // Checking only the claim locked out every parent who reached their child through the
    // parent-linking flow, which sets the link and not the claim.
    if (athlete.claimed_by_user_id === user.id) {
      return NextResponse.json({ canEdit: true })
    }

    const { data: link } = await supabase
      .from("parent_athlete_links")
      .select("id")
      .eq("user_id", user.id)
      .eq("athlete_id", id)
      .maybeSingle()

    return NextResponse.json({ canEdit: Boolean(link) })
  } catch (error) {
    console.error("[v0] Error checking edit permission:", error)
    return NextResponse.json({ canEdit: false })
  }
}
