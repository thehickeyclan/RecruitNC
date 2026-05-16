import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
  const type = searchParams.get("type") // "spartan" | "campaign" | null

  const supabase = await createClient()

  try {
    // Get spartan donations
    let query = supabase
      .from("spartan_donations")
      .select(`
        id,
        amount_cents,
        donor_name,
        donor_email,
        athlete_code,
        athlete_display_name,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    const { data: donations, error } = await query

    if (error) throw error

    const formattedDonations = (donations || []).map((d) => ({
      id: d.id,
      amount_cents: d.amount_cents || 0,
      donor_name: d.donor_name,
      donor_email: d.donor_email,
      athlete_code: d.athlete_code,
      athlete_display_name: d.athlete_display_name,
      campaign_name: null,
      type: "spartan" as const,
      created_at: d.created_at,
    }))

    // Filter by type if specified
    const filtered = type === "campaign" 
      ? [] // No campaigns in this version
      : type === "spartan"
        ? formattedDonations
        : formattedDonations

    return NextResponse.json({ donations: filtered })
  } catch (error) {
    console.error("Donations list error:", error)
    return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 })
  }
}
