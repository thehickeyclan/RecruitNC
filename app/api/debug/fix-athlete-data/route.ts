import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    // Get the athlete ID from the query parameters
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("id")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Fetch the athlete data
    const { data: athlete, error: fetchError } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (fetchError) {
      console.error("Error fetching athlete:", fetchError)
      return NextResponse.json({ error: "Failed to fetch athlete data" }, { status: 500 })
    }

    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Extract the name parts if name exists but firstName/lastName don't
    let firstName = athlete.firstName
    let lastName = athlete.lastName

    if (!firstName || !lastName) {
      const nameParts = (athlete.name || "").split(" ")
      firstName = firstName || nameParts[0] || ""
      lastName = lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")
    }

    // Prepare the update data
    const updateData: Record<string, any> = {
      firstName,
      lastName,
    }

    // Ensure camelCase and lowercase versions of fields exist
    if (athlete.highschool && !athlete.highSchool) updateData.highSchool = athlete.highschool
    if (athlete.highSchool && !athlete.highschool) updateData.highschool = athlete.highSchool

    if (athlete.weightclass && !athlete.weightClass) updateData.weightClass = athlete.weightclass
    if (athlete.weightClass && !athlete.weightclass) updateData.weightclass = athlete.weightClass

    if (athlete.graduationyear && !athlete.graduationYear) updateData.graduationYear = athlete.graduationyear
    if (athlete.graduationYear && !athlete.graduationyear) updateData.graduationyear = athlete.graduationYear

    if (athlete.commitmentdate && !athlete.commitmentDate) updateData.commitmentDate = athlete.commitmentdate
    if (athlete.commitmentDate && !athlete.commitmentdate) updateData.commitmentdate = athlete.commitmentDate

    if (athlete.photourl && !athlete.photoUrl) updateData.photoUrl = athlete.photourl
    if (athlete.photoUrl && !athlete.photourl) updateData.photourl = athlete.photoUrl

    if (athlete.wrestlingclub && !athlete.wrestlingClub) updateData.wrestlingClub = athlete.wrestlingclub
    if (athlete.wrestlingClub && !athlete.wrestlingclub) updateData.wrestlingclub = athlete.wrestlingClub

    // Special handling for Liam Hickey
    if (athlete.name === "Liam Hickey") {
      if (!athlete.college) updateData.college = "UNC Chapel Hill"
      if (!athlete.division) updateData.division = "D1"
      if (!athlete.photourl && !athlete.photoUrl) updateData.photourl = "/diverse-wrestlers.png"
      if (!athlete.commitmentPhotoUrl) updateData.commitmentPhotoUrl = "/diverse-wrestlers.png"
    }

    // Special handling for Hayden Litten
    if (athlete.name === "Hayden Litten") {
      if (!athlete.college) updateData.college = "Appalachian State"
      if (!athlete.division) updateData.division = "D1"
      if (!athlete.photourl && !athlete.photoUrl) updateData.photourl = "/wrestler-profile.png"
      if (!athlete.commitmentPhotoUrl) updateData.commitmentPhotoUrl = "/wrestler-profile.png"
    }

    // Only update if there are changes to make
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        message: "No updates needed",
        athlete,
      })
    }

    // Update the athlete data
    const { data: updatedAthlete, error: updateError } = await supabase
      .from("athletes")
      .update(updateData)
      .eq("id", athleteId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating athlete:", updateError)
      return NextResponse.json({ error: "Failed to update athlete data" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Athlete data fixed successfully",
      updates: updateData,
      before: athlete,
      after: updatedAthlete,
    })
  } catch (error) {
    console.error("Error in fix-athlete-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
