import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const athletes = await request.json()

    if (!Array.isArray(athletes) || athletes.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid data format. Expected an array of athletes.",
          details: "Please check that your data is formatted correctly.",
        },
        { status: 400 },
      )
    }

    // Check if there are too many athletes (optional, set a reasonable limit)
    if (athletes.length > 100) {
      return NextResponse.json(
        {
          error: "Too many athletes in a single import.",
          details: "Please limit your import to 100 athletes at a time.",
        },
        { status: 400 },
      )
    }

    // Format the athletes to match the database schema
    const formattedAthletes = athletes.map((athlete) => {
      // Log the incoming athlete data for debugging
      console.log("Processing athlete:", JSON.stringify(athlete, null, 2))

      // Handle achievements properly
      let achievements = athlete.achievements
      if (typeof achievements === "string") {
        // If it's a string, split by semicolon
        achievements = achievements
          .split(";")
          .map((a) => a.trim())
          .filter((a) => a)
      } else if (!Array.isArray(achievements)) {
        // If it's neither a string nor an array, set to empty array
        achievements = []
      }

      return {
        name: athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim(),
        firstName: athlete.firstName || athlete.name?.split(" ")[0] || "",
        lastName:
          athlete.lastName || (athlete.name?.split(" ").length > 1 ? athlete.name?.split(" ").slice(1).join(" ") : ""),
        highschool: athlete.highSchool || athlete.highschool || "",
        college: athlete.college || "",
        division: athlete.division || "",
        weightclass: athlete.weightClass || athlete.weightclass || "",
        graduationyear: Number(athlete.graduationYear || athlete.graduationyear) || new Date().getFullYear(),
        commitmentdate: athlete.commitmentDate || athlete.commitmentdate || new Date().toISOString().split("T")[0],
        photourl: athlete.photoUrl || athlete.photourl || "",
        commitmentPhotoUrl: athlete.commitmentPhotoUrl || "",
        achievements: achievements,
        gender: athlete.gender || "Male",
        wrestlingClub: athlete.wrestlingClub || "",
        ncUnitedTeam: athlete.ncUnitedTeam || "none",
        location: athlete.location || "",
      }
    })

    // Log the formatted athletes for debugging
    console.log("Formatted athletes:", JSON.stringify(formattedAthletes, null, 2))

    // Validate required fields
    const invalidAthletes = formattedAthletes.filter(
      (athlete) =>
        !athlete.name ||
        !athlete.highschool ||
        !athlete.wrestlingClub ||
        !athlete.college ||
        !athlete.division ||
        !athlete.commitmentdate ||
        !athlete.achievements ||
        athlete.achievements.length === 0,
    )

    if (invalidAthletes.length > 0) {
      console.log("Invalid athletes:", JSON.stringify(invalidAthletes, null, 2))
      return NextResponse.json(
        {
          error: "Some athletes are missing required fields",
          invalidCount: invalidAthletes.length,
          invalidAthletes: invalidAthletes.map((a) => ({ name: a.name, missing: getMissingFields(a) })),
        },
        { status: 400 },
      )
    }

    // Insert the athletes into the database
    const { data, error } = await supabase.from("athletes").insert(formattedAthletes).select()

    if (error) {
      console.error("Error inserting athletes:", error)
      return NextResponse.json(
        {
          error: "Failed to insert athletes into the database.",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    // Get the IDs of the inserted athletes
    const importedIds = data ? data.map((athlete) => athlete.id) : []

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${formattedAthletes.length} athletes`,
      importedCount: formattedAthletes.length,
      importedIds: importedIds,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error in bulk import API:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// Helper function to identify missing fields
function getMissingFields(athlete) {
  const missingFields = []
  if (!athlete.name) missingFields.push("name")
  if (!athlete.highschool) missingFields.push("highschool")
  if (!athlete.wrestlingClub) missingFields.push("wrestlingClub")
  if (!athlete.college) missingFields.push("college")
  if (!athlete.division) missingFields.push("division")
  if (!athlete.commitmentdate) missingFields.push("commitmentdate")
  if (!athlete.achievements || athlete.achievements.length === 0) missingFields.push("achievements")
  return missingFields
}
