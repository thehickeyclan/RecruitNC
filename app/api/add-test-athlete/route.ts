import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Create a test athlete with a known image URL
    const testAthlete = {
      name: "Test Athlete",
      highschool: "Test High School",
      college: "Test University",
      division: "D1",
      weightclass: "165",
      graduationyear: 2024,
      commitmentdate: new Date().toISOString(),
      photourl: "/wrestler-profile.png", // Using a known image from the public directory
    }

    // Insert the test athlete
    const { data, error } = await supabase.from("athletes").insert(testAthlete).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Test athlete added successfully",
      athlete: data[0],
    })
  } catch (error) {
    console.error("Error adding test athlete:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
