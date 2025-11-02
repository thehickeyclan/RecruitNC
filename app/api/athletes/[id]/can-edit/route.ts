import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
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
      .eq("id", params.id)
      .single()

    if (error || !athlete) {
      return NextResponse.json({ canEdit: false })
    }

    // Check if user owns this profile
    const canEdit = athlete.claimed_by_user_id === user.id

    return NextResponse.json({ canEdit })
  } catch (error) {
    console.error("[v0] Error checking edit permission:", error)
    return NextResponse.json({ canEdit: false })
  }
}
