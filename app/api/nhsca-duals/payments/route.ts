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

    // Query the CORRECT table: national_team_event_registrations for nhsca-duals-2026
    const { data: registrations } = await supabase
      .from("national_team_event_registrations")
      .select("id, athlete_first_name, athlete_last_name, parent_email, reg_fee_cents, apparel_fee_cents, status, created_at")
      .eq("event_slug", "nhsca-duals-2026")
      .order("created_at", { ascending: false })

    // Transform to payments format
    const payments = (registrations || []).map(r => ({
      id: r.id,
      name: `${r.athlete_first_name} ${r.athlete_last_name}`,
      amount_cents: (r.reg_fee_cents || 0) + (r.apparel_fee_cents || 0),
      status: r.status,
      created_at: r.created_at,
      items: [
        { name: `Registration: $${(r.reg_fee_cents || 0) / 100}` },
        { name: `Apparel: $${(r.apparel_fee_cents || 0) / 100}` }
      ],
      type: "national_team"
    }))

    return NextResponse.json({ payments })
  } catch (e) {
    console.error("[nhsca-payments]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
