import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Function to calculate similarity between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1.0

  // Simple similarity based on common words and character overlap
  const words1 = s1.split(" ")
  const words2 = s2.split(" ")

  let commonWords = 0
  words1.forEach((word1) => {
    if (words2.some((word2) => word2.includes(word1) || word1.includes(word2))) {
      commonWords++
    }
  })

  const wordSimilarity = commonWords / Math.max(words1.length, words2.length)

  // Character-based similarity
  let commonChars = 0
  const minLength = Math.min(s1.length, s2.length)
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) commonChars++
  }
  const charSimilarity = commonChars / Math.max(s1.length, s2.length)

  return wordSimilarity * 0.7 + charSimilarity * 0.3
}

export async function POST(request: NextRequest) {
  try {
    const { name, school } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Get all existing athletes from database
    const { data: existingAthletes, error } = await supabase.from("athletes").select("id, name, highschool, college")

    if (error) {
      console.error("Error fetching athletes:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Find best matching profile
    let bestMatch = null
    let bestScore = 0

    for (const existing of existingAthletes) {
      const nameScore = calculateSimilarity(name, existing.name)
      const schoolScore = school ? calculateSimilarity(school, existing.highschool || "") : 0

      // Weighted score (name is more important)
      const totalScore = nameScore * 0.8 + schoolScore * 0.2

      if (totalScore > bestScore && totalScore > 0.6) {
        bestScore = totalScore
        bestMatch = {
          athlete_id: existing.id,
          name: existing.name,
          school: existing.highschool,
          confidence: totalScore,
        }
      }
    }

    return NextResponse.json({ match: bestMatch })
  } catch (error) {
    console.error("Error finding profile match:", error)
    return NextResponse.json({ error: "Failed to find profile match" }, { status: 500 })
  }
}
