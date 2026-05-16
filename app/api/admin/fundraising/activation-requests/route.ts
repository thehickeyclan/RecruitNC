import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const supabase = await createClient()

  try {
    const { data: requests, error } = await supabase
      .from("fundraising_activation_requests")
      .select(`
        id,
        fundraising_slug,
        user_id,
        requester_email,
        athlete_id,
        status,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Get athlete names for requests that have athlete_id
    const athleteIds = requests?.filter(r => r.athlete_id).map(r => r.athlete_id) || []
    let athleteNames: Record<string, string> = {}

    if (athleteIds.length > 0) {
      const { data: athletes } = await supabase
        .from("athletes")
        .select("id, name")
        .in("id", athleteIds)

      athleteNames = (athletes || []).reduce((acc, a) => {
        acc[a.id] = a.name
        return acc
      }, {} as Record<string, string>)
    }

    const formattedRequests = (requests || []).map((r) => ({
      ...r,
      athlete_name: r.athlete_id ? athleteNames[r.athlete_id] || null : null,
    }))

    return NextResponse.json({ requests: formattedRequests })
  } catch (error) {
    console.error("Activation requests error:", error)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}
