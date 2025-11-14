import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFieldPersistence() {
  console.log("Testing direct field persistence...")

  // Test with Tobin McNair's ID
  const athleteId = "63ea613d-0886-4af0-b64b-1c3d80fe0332"

  const testData = {
    super_32_2024_record: "5-2",
    super_32_2024_placement: "3rd Place",
    super_32_2025_record: "7-1",
    super_32_2025_placement: "Champion",
    nationally_ranked_wins: "Beat John Smith (Duke) at UNC Open",
    college_opens_experience: "UNC Open: 4-1, Virginia Tech Open: 3-2",
    wrestlingClub: "NC United Blue",
  }

  console.log("Updating athlete with test data:", testData)

  const { data, error } = await supabase.from("athletes").update(testData).eq("id", athleteId).select()

  if (error) {
    console.error("Update failed:", error)
  } else {
    console.log("Update successful:", data)
  }

  // Verify the data was saved
  const { data: verifyData, error: verifyError } = await supabase
    .from("athletes")
    .select(
      "super_32_2024_record, super_32_2024_placement, super_32_2025_record, super_32_2025_placement, nationally_ranked_wins, college_opens_experience, wrestlingClub",
    )
    .eq("id", athleteId)
    .single()

  if (verifyError) {
    console.error("Verification failed:", verifyError)
  } else {
    console.log("Verification successful:", verifyData)
  }
}

testFieldPersistence()
