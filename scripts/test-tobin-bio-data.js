import { createServerClient } from "@supabase/ssr"

const supabase = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  cookies: {
    get: () => null,
    set: () => {},
    remove: () => {},
  },
})

async function testTobinBioData() {
  console.log("[v0] Testing Tobin's bio data...")

  const { data, error } = await supabase
    .from("athletes")
    .select("id, name, bio, bio_headline")
    .eq("id", "63ea613d-0886-4af0-b64b-1c3d80fe0332")
    .single()

  if (error) {
    console.log("[v0] Error fetching Tobin's data:", error)
    return
  }

  console.log("[v0] Tobin's data from database:")
  console.log("[v0] Name:", data.name)
  console.log("[v0] Bio:", data.bio)
  console.log("[v0] Bio Headline:", data.bio_headline)
  console.log("[v0] Bio length:", data.bio ? data.bio.length : "null")
  console.log("[v0] Headline length:", data.bio_headline ? data.bio_headline.length : "null")
}

testTobinBioData()
