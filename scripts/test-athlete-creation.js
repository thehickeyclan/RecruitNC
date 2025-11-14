import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function createTestAthlete() {
  console.log("Creating test athlete...")

  const athleteData = {
    name: "Test Athlete",
    firstName: "Test",
    lastName: "Athlete",
    gender: "Male",
    graduationyear: 2025,
    highschool: "Test High School",
    weightclass: "160",
    is_prospect: true,
    recruiting_status: "Uncommitted",
  }

  const { data, error } = await supabase.from("athletes").insert([athleteData]).select()

  if (error) {
    console.error("Error:", error)
  } else {
    console.log("Success:", data)
  }
}

createTestAthlete()
