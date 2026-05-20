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

    // Fetch from NHSCA Duals payments table
    let nhscaQuery = supabase
      .from("nhsca_duals_payments")
      .select("id, user_id, athlete_name, team, status, amount_cents, items, stripe_session_id, paid_at, created_at")
      .order("created_at", { ascending: false })

    // Regular users only see their own orders
    if (!isAdmin) {
      nhscaQuery = nhscaQuery.eq("user_id", user.id)
    }

    const { data: nhscaPayments } = await nhscaQuery

    // Fetch from old orders table (ALL orders, real columns)
    const { data: legacyOrders } = await supabase
      .from("orders")
      .select("id, customer_id, customer_name, email, status, total, created_at")
      .order("created_at", { ascending: false })

    // Transform and merge both
    const nhscaFormatted = (nhscaPayments || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      name: p.athlete_name || "—",
      amount_cents: p.amount_cents,
      status: p.status,
      created_at: p.created_at,
      items: p.items,
      type: "nhsca_2026"
    }))

    const legacyFormatted = (legacyOrders || []).map(o => ({
      id: o.id,
      user_id: o.customer_id,
      name: o.customer_name || o.email || "—",
      amount_cents: Math.round((parseFloat(o.total) || 0) * 100),
      status: o.status,
      created_at: o.created_at,
      items: [{ name: "National Team Registration" }],
      type: "national_team"
    }))

    // Combine and sort by date
    const allPayments = [...nhscaFormatted, ...legacyFormatted].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ payments: allPayments })
  } catch (e) {
    console.error("[nhsca-payments]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
