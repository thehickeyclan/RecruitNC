import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const adminSupabase = createServiceRoleClient()

    console.log("[v0] Fetching college coaches with service role client...")

    const { data: coaches, error } = await adminSupabase
      .from("user_profiles")
      .select("*")
      .or(`profile_type.in.(college-coach,college_coach,coach),role.in.(college-coach,college_coach,coach)`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching coaches:", error)
      return NextResponse.json({ error: "Failed to fetch coaches" }, { status: 500 })
    }

    console.log(`[v0] Found ${coaches?.length || 0} coaches total`)

    if (coaches && coaches.length > 0) {
      console.log("[v0] Coach profiles found:")
      coaches.forEach((c) => {
        console.log(
          `  - ${c.full_name || c.email}: profile_type="${c.profile_type}", role="${c.role}", verified_coach=${c.verified_coach}, verification_status=${c.verification_status}`,
        )
      })
    }

    // Separate pending, approved, and rejected coaches
    const pending = coaches?.filter((c) => !c.verified_coach && c.verification_status !== "rejected") || []
    const approved = coaches?.filter((c) => c.verified_coach) || []
    const rejected = coaches?.filter((c) => c.verification_status === "rejected") || []

    console.log(`[v0] Pending: ${pending.length}, Approved: ${approved.length}, Rejected: ${rejected.length}`)

    return NextResponse.json({
      success: true,
      pending,
      approved,
      rejected,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
