/**
 * Script to fix committed athletes missing from school portals
 * 
 * Usage:
 *   npx tsx scripts/fix-committed-athletes.ts "Kavan Wilson" "Reinhardt University"
 * 
 * Or to list all committed athletes:
 *   npx tsx scripts/fix-committed-athletes.ts --list
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SCHOOL_NAME_STRIP_REGEX = /(?:College|University|Institute|School|of|the)\s*/gi

function buildSchoolNameVariations(collegeName: string) {
  const trimmed = collegeName.trim()
  const variations = new Set<string>()
  variations.add(trimmed)
  const stripped = trimmed.replace(SCHOOL_NAME_STRIP_REGEX, "").trim()
  if (stripped) variations.add(stripped)
  const firstWord = trimmed.split(" ")[0]
  if (firstWord && firstWord.length > 2) variations.add(firstWord)
  return Array.from(variations).filter((value) => value.length > 1)
}

async function findSchoolByCollegeName(collegeName: string) {
  const variations = buildSchoolNameVariations(collegeName)
  for (const variation of variations) {
    const { data, error } = await adminSupabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${variation}%`)
      .limit(1)
    if (error) {
      console.error(`[fix-committed] Error searching schools for "${variation}":`, error)
      continue
    }
    if (data && data.length > 0) {
      return data[0]
    }
  }
  return null
}

function isCommittedStatus(status?: string | null) {
  if (!status) return false
  const COMMITTED_STATUSES = ["committed", "signed", "college athlete"]
  const normalized = status.trim().toLowerCase()
  return COMMITTED_STATUSES.includes(normalized)
}

async function fixAthlete(athleteName: string, collegeName: string) {
  console.log(`\n🔍 Searching for athlete: "${athleteName}" committed to "${collegeName}"...`)

  // First, try to find by name only to see what we have
  const { data: athletesByName, error: nameError } = await adminSupabase
    .from("athletes")
    .select("id, name, college, recruiting_status")
    .ilike("name", `%${athleteName}%`)
    .limit(10)

  if (nameError) {
    console.error("❌ Error searching for athlete by name:", nameError)
    return
  }

  if (!athletesByName || athletesByName.length === 0) {
    console.error(`❌ No athlete found with name matching "${athleteName}"`)
    console.log("\n💡 Try searching with a partial name or check the spelling.")
    return
  }

  console.log(`\n📋 Found ${athletesByName.length} athlete(s) with matching name:`)
  athletesByName.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.name} - College: "${a.college || 'N/A'}" - Status: ${a.recruiting_status || 'N/A'}`)
  })

  // Now filter by college
  const athletes = athletesByName.filter(a => {
    if (!a.college) return false
    const athleteCollege = a.college.toLowerCase()
    const searchCollege = collegeName.toLowerCase()
    return athleteCollege.includes(searchCollege) || searchCollege.includes(athleteCollege)
  })

  if (athletes.length === 0) {
    console.error(`\n❌ No athlete found matching "${athleteName}" committed to "${collegeName}"`)
    console.log(`\n💡 Found athletes with that name, but none with college matching "${collegeName}"`)
    console.log(`   Available colleges for this name: ${[...new Set(athletesByName.map(a => a.college).filter(Boolean))].join(", ")}`)
    return
  }

  if (athletes.length > 1) {
    console.warn(`⚠️  Found ${athletes.length} athletes matching criteria:`)
    athletes.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.name} - ${a.college} (${a.recruiting_status})`)
    })
    console.log("   Using first match...")
  }

  const athlete = athletes[0]
  console.log(`✅ Found athlete: ${athlete.name} (ID: ${athlete.id})`)

  // Check if committed
  if (!isCommittedStatus(athlete.recruiting_status)) {
    console.error(`❌ Athlete is not committed. Status: ${athlete.recruiting_status}`)
    return
  }

  if (!athlete.college) {
    console.error("❌ Athlete has no college name set")
    return
  }

  // Find school
  console.log(`\n🔍 Searching for school matching "${athlete.college}"...`)
  const school = await findSchoolByCollegeName(athlete.college)
  if (!school) {
    console.error(`❌ No school found matching college name: ${athlete.college}`)
    return
  }
  console.log(`✅ Found school: ${school.name} (ID: ${school.id})`)

  // Get coaches
  const { data: schoolCoaches, error: coachError } = await adminSupabase
    .from("user_profiles")
    .select("user_id")
    .eq("school_id", school.id)

  if (coachError) {
    console.error("❌ Error fetching coaches:", coachError)
    return
  }

  let coachIds = schoolCoaches?.map((c: { user_id: string | null }) => c.user_id).filter((id: string | null): id is string => !!id) || []

  if (coachIds.length === 0) {
    console.warn("⚠️  No coaches found for school, using admin fallback...")
    const { data: fallbackAdmin } = await adminSupabase
      .from("user_profiles")
      .select("user_id")
      .or("is_admin.eq.true,role.eq.admin")
      .limit(1)
      .single()

    if (!fallbackAdmin?.user_id) {
      console.error("❌ No admin fallback available")
      return
    }
    coachIds = [fallbackAdmin.user_id]
  }

  console.log(`✅ Found ${coachIds.length} coach(es) for school`)

  // Check existing stars
  const { data: existingStars } = await adminSupabase
    .from("college_coach_stars")
    .select("id, coach_user_id, pipeline_stage")
    .eq("athlete_id", athlete.id)
    .in("coach_user_id", coachIds)

  const committedPayload = {
    pipeline_stage: "Committed",
    interest_level: "high",
    committed_date: new Date().toISOString(),
  }

  if (existingStars && existingStars.length > 0) {
    console.log(`\n📝 Updating ${existingStars.length} existing star record(s)...`)
    const ids = existingStars.map((s: { id: string }) => s.id)
    const { error: updateError } = await adminSupabase
      .from("college_coach_stars")
      .update(committedPayload)
      .in("id", ids)

    if (updateError) {
      console.error("❌ Failed to update star records:", updateError)
      return
    }

    console.log(`✅ Successfully updated ${ids.length} star record(s) to Committed`)
  } else {
    console.log(`\n➕ Creating new star record...`)
    const targetCoachId = coachIds[0]
    const { error: insertError } = await adminSupabase
      .from("college_coach_stars")
      .insert({
        coach_user_id: targetCoachId,
        athlete_id: athlete.id,
        school_id: school.id,
        pipeline_stage: "Committed",
        interest_level: "high",
        notes: `Auto-added on ${new Date().toLocaleDateString()} – committed to ${athlete.college}`,
        starred_at: new Date().toISOString(),
        committed_date: new Date().toISOString(),
      })

    if (insertError) {
      console.error("❌ Failed to create star record:", insertError)
      return
    }

    console.log(`✅ Successfully created star record and set to Committed`)
  }

  console.log(`\n🎉 Done! ${athlete.name} should now appear in ${school.name}'s portal funnel.`)
}

async function listCommittedAthletes() {
  console.log("\n📋 Fetching all committed athletes...\n")

  const { data: athletes, error } = await adminSupabase
    .from("athletes")
    .select("id, name, college, recruiting_status, graduationyear")
    .or("recruiting_status.eq.Committed,recruiting_status.eq.Signed,recruiting_status.eq.College Athlete")
    .order("name", { ascending: true })

  if (error) {
    console.error("❌ Error fetching athletes:", error)
    return
  }

  if (!athletes || athletes.length === 0) {
    console.log("No committed athletes found.")
    return
  }

  // Get star entries
  const athleteIds = athletes.map(a => a.id)
  const { data: stars } = await adminSupabase
    .from("college_coach_stars")
    .select("athlete_id, pipeline_stage")
    .in("athlete_id", athleteIds)
    .in("pipeline_stage", ["Committed", "Signed", "committed", "signed"])

  const starredAthleteIds = new Set(stars?.map(s => s.athlete_id) || [])

  console.log(`Total Committed Athletes: ${athletes.length}`)
  console.log(`In Portal: ${starredAthleteIds.size}`)
  console.log(`Not In Portal: ${athletes.length - starredAthleteIds.size}\n`)

  console.log("=" .repeat(100))
  console.log(`${"Name".padEnd(30)} ${"College".padEnd(35)} ${"Status".padEnd(15)} ${"Year".padEnd(6)} ${"In Portal"}`)
  console.log("=" .repeat(100))

  athletes.forEach((athlete) => {
    const inPortal = starredAthleteIds.has(athlete.id)
    const name = (athlete.name || "N/A").padEnd(30)
    const college = (athlete.college || "N/A").padEnd(35)
    const status = (athlete.recruiting_status || "N/A").padEnd(15)
    const year = (athlete.graduationyear?.toString() || "N/A").padEnd(6)
    const portalStatus = inPortal ? "✅ Yes" : "❌ No"
    console.log(`${name} ${college} ${status} ${year} ${portalStatus}`)
  })

  console.log("=" .repeat(100))
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes("--list") || args.length === 0) {
    await listCommittedAthletes()
  } else if (args.length >= 2) {
    const athleteName = args[0]
    const collegeName = args[1]
    await fixAthlete(athleteName, collegeName)
  } else {
    console.log("Usage:")
    console.log('  Fix athlete: npx tsx scripts/fix-committed-athletes.ts "Athlete Name" "College Name"')
    console.log("  List all:   npx tsx scripts/fix-committed-athletes.ts --list")
    process.exit(1)
  }
}

main().catch(console.error)

