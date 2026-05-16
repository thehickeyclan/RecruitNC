import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100)
  const type = searchParams.get("type") // "spartan" | "campaign" | null (all)

  const supabase = await createClient()

  try {
    let query = supabase
      .from("spartan_donations")
      .select(`
        id,
        amount_cents,
        donor_name,
        donor_email,
        athlete_code,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    const { data: donations, error } = await query

    if (error) throw error

    const formattedDonations = (donations || []).map((d) => ({
      id: d.id,
      amount: Math.round((d.amount_cents || 0) / 100),
      donor_name: d.donor_name || "Anonymous",
      athlete_name: d.athlete_code || null,
      campaign_name: null,
      type: "spartan" as const,
      created_at: d.created_at,
    }))

    return NextResponse.json({ donations: formattedDonations })
  } catch (error) {
    console.error("Recent donations error:", error)
    return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 })
  }
}
