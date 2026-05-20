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
    console.log("[v0] Admin check:", user.id, "isAdmin:", isAdmin, "profile:", profile)
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

    // Fetch from old orders table (national team registrations)
    let ordersQuery = supabase
      .from("orders")
      .select("id, customer_id, athlete_name, registration_fee, apparel_fee, total_amount, status, created_at")
      .eq("campaign", "national_team")
      .order("created_at", { ascending: false })

    // Regular users only see their own orders - use customer_id not user_id
    if (!isAdmin) {
      ordersQuery = ordersQuery.eq("customer_id", user.id)
    }

    const { data: legacyOrders } = await ordersQuery

    // Transform and merge both
    const nhscaFormatted = (nhscaPayments || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      athlete_name: p.athlete_name || "—",
      amount_cents: p.amount_cents,
      status: p.status,
      created_at: p.created_at,
      items: p.items,
      type: "nhsca_2026"
    }))

    const legacyFormatted = (legacyOrders || []).map(o => ({
      id: o.id,
      user_id: o.customer_id,
      athlete_name: o.athlete_name || "—",
      amount_cents: (o.total_amount || 0) * 100,
      status: o.status,
      created_at: o.created_at,
      items: [{ name: `Registration: $${o.registration_fee || 0}, Apparel: $${o.apparel_fee || 0}` }],
      type: "national_team"
    }))

    // Combine and sort by date
    const allPayments = [...nhscaFormatted, ...legacyFormatted].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    
    console.log("[v0] Payments result:", "nhsca:", nhscaFormatted.length, "legacy:", legacyFormatted.length, "total:", allPayments.length)

    return NextResponse.json({ payments: allPayments })
  } catch (e) {
    console.error("[nhsca-payments]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
