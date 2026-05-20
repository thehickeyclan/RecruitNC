import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ payments: [] })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    const isAdmin = profile?.role === "admin"
    const statusFilter = req.nextUrl.searchParams.get("status")

    let query = supabase
      .from("nhsca_duals_payments")
      .select("id, user_id, athlete_name, team, status, amount_cents, items, stripe_session_id, paid_at, created_at")

    // If admin, show all orders; otherwise show only user's orders
    if (isAdmin) {
      // Admin can optionally filter by status
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }
    } else {
      // Non-admin only sees their own orders
      query = query.eq("user_id", user.id)
    }

    const { data: payments, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[nhsca-payments] fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (e) {
    console.error("[nhsca-payments]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
