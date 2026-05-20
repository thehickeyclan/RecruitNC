import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ payments: [] })
    }

    const { data: payments, error } = await supabase
      .from("nhsca_duals_payments")
      .select("id, status, amount_cents, items, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[nhsca-payments] fetch error:", error)
      return NextResponse.json({ payments: [] })
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (e) {
    console.error("[nhsca-payments]", e)
    return NextResponse.json({ payments: [] })
  }
}
