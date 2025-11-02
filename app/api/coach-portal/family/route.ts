import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: familyMembers, error } = await supabase
      .from("coach_athlete_family")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("relationship", { ascending: true })

    if (error) throw error

    return NextResponse.json({ familyMembers: familyMembers || [] })
  } catch (error) {
    console.error("Error fetching family members:", error)
    return NextResponse.json({ error: "Failed to fetch family members" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { athleteId, name, relationship, phone, email } = body

    if (!athleteId || !name || !relationship) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("coach_athlete_family")
      .insert({
        athlete_id: athleteId,
        coach_user_id: user.id,
        name,
        relationship,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ familyMember: data })
  } catch (error) {
    console.error("Error adding family member:", error)
    return NextResponse.json({ error: "Failed to add family member" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const familyMemberId = searchParams.get("familyMemberId")

    if (!familyMemberId) {
      return NextResponse.json({ error: "Family member ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("coach_athlete_family").delete().eq("id", familyMemberId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting family member:", error)
    return NextResponse.json({ error: "Failed to delete family member" }, { status: 500 })
  }
}
