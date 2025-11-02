import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting RecruitNC score calculation")
    const { year, gender } = await request.json()
    console.log("[v0] Request params:", { year, gender })

    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    // Fetch athletes with all relevant data
    console.log("[v0] Fetching athletes...")
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select(`
        id, name, graduationyear, gender, academic_gpa, wrestling_name,
        nationally_ranked_wins, college_opens_experience,
        nhsca_2024_placement, nhsca_2025_placement, nhsca_2024_record, nhsca_2025_record,
        super_32_2024_placement, super_32_2025_placement, super_32_2024_record, super_32_2025_record,
        achievements, additional_achievements
      `)
      .eq("graduationyear", year)
      .eq("gender", gender)
      .order("name")

    if (error) {
      console.error("[v0] Athletes query error:", error)
      throw error
    }
    console.log("[v0] Found athletes:", athletes?.length || 0)

    // Fetch NCHSAA results separately
    console.log("[v0] Fetching NCHSAA results...")
    const { data: nchsaaResults, error: nchsaaError } = await supabase
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, year, place, classification")

    if (nchsaaError) {
      console.error("[v0] NCHSAA query error:", nchsaaError)
      console.log("[v0] Continuing without NCHSAA data")
    }
    console.log("[v0] Found NCHSAA results:", nchsaaResults?.length || 0)

    // Calculate scores for each athlete
    const scoredAthletes = (athletes || []).map((athlete) => {
      console.log("[v0] Calculating score for:", athlete.name)
      let totalScore = 0
      const breakdown = { super_32: 0, nhsca: 0, nchsaa: 0 }

      // Super 32 Scoring (Max 20 points)
      let super32Score = 0
      // Check placement fields
      ;[athlete.super_32_2024_placement, athlete.super_32_2025_placement].forEach((placement) => {
        if (placement) {
          const place = Number.parseInt(placement)
          if (!isNaN(place)) {
            if (place === 1)
              super32Score += 20 // Champion
            else if (place <= 3)
              super32Score += 15 // 2nd-3rd place
            else if (place <= 8)
              super32Score += 10 // 4th-8th place
            else if (place <= 16) super32Score += 5 // 9th-16th place
          }
        }
      })

      // Check record fields for wins/losses if no placement
      ;[athlete.super_32_2024_record, athlete.super_32_2025_record].forEach((record) => {
        if (record && super32Score === 0) {
          const winMatch = record.match(/(\d+)-(\d+)/)
          if (winMatch) {
            const wins = Number.parseInt(winMatch[1]) || 0
            if (wins >= 3)
              super32Score += 10 // Good performance (3+ wins)
            else if (wins >= 1) super32Score += 5 // Some wins (1+ wins)
          }
        }
      })

      breakdown.super_32 = Math.min(super32Score, 20)
      totalScore += breakdown.super_32

      // NHSCA Scoring (Max 15 points)
      let nhscaScore = 0
      // Check placement fields
      ;[athlete.nhsca_2024_placement, athlete.nhsca_2025_placement].forEach((placement) => {
        if (placement) {
          const place = Number.parseInt(placement)
          if (!isNaN(place)) {
            if (place === 1)
              nhscaScore += 15 // Champion
            else if (place <= 3)
              nhscaScore += 12 // 2nd-3rd place
            else if (place <= 8)
              nhscaScore += 8 // All-American (4th-8th)
            else if (place <= 16) nhscaScore += 4 // 9th-16th place
          }
        }
      })

      // Check record fields if no placement
      ;[athlete.nhsca_2024_record, athlete.nhsca_2025_record].forEach((record) => {
        if (record && nhscaScore === 0) {
          const winMatch = record.match(/(\d+)-(\d+)/)
          if (winMatch) {
            const wins = Number.parseInt(winMatch[1]) || 0
            if (wins >= 3)
              nhscaScore += 8 // Good performance (3+ wins)
            else if (wins >= 1) nhscaScore += 4 // Some wins (1+ wins)
          }
        }
      })

      breakdown.nhsca = Math.min(nhscaScore, 15)
      totalScore += breakdown.nhsca

      // NCHSAA State Championship Scoring (Max 15 points)
      let nchsaaScore = 0

      if (nchsaaResults && athlete.name) {
        const normalizeName = (name: string) =>
          name
            ?.toLowerCase()
            .replace(/[^a-z\s]/g, "")
            .trim() || ""
        const athleteName = normalizeName(athlete.name)
        const wrestlingName = normalizeName(athlete.wrestling_name || "")

        const athleteNchsaaResults = nchsaaResults.filter((result) => {
          if (!result.wrestler_name) return false
          const resultName = normalizeName(result.wrestler_name)

          // Try exact match first
          if (resultName === athleteName || resultName === wrestlingName) {
            return true
          }

          // Try partial matches with individual name parts
          const athleteNameParts = athleteName.split(/\s+/).filter((part) => part.length > 2)
          const wrestlingNameParts = wrestlingName.split(/\s+/).filter((part) => part.length > 2)
          const resultNameParts = resultName.split(/\s+/).filter((part) => part.length > 2)

          // Check if at least 2 name parts match (first + last name typically)
          for (const athletePart of athleteNameParts) {
            for (const resultPart of resultNameParts) {
              if (athletePart === resultPart && athletePart.length > 2) {
                // Found matching name part, check for another match
                const otherAthleteMatch = athleteNameParts.find((p) => p !== athletePart && resultNameParts.includes(p))
                if (otherAthleteMatch) {
                  return true
                }
              }
            }
          }

          // Same check for wrestling name
          for (const wrestlingPart of wrestlingNameParts) {
            for (const resultPart of resultNameParts) {
              if (wrestlingPart === resultPart && wrestlingPart.length > 2) {
                const otherWrestlingMatch = wrestlingNameParts.find(
                  (p) => p !== wrestlingPart && resultNameParts.includes(p),
                )
                if (otherWrestlingMatch) {
                  return true
                }
              }
            }
          }

          return false
        })

        console.log(`[v0] NCHSAA matching for ${athlete.name}:`, {
          athleteName,
          wrestlingName,
          foundResults: athleteNchsaaResults.length,
          sampleMatches: athleteNchsaaResults.slice(0, 3).map((r) => r.wrestler_name),
        })

        for (const result of athleteNchsaaResults) {
          if (!result.place) continue
          const place = Number.parseInt(result.place)
          if (isNaN(place)) continue

          const classification = result.classification || ""

          if (place === 1) {
            if (classification === "4A")
              nchsaaScore += 15 // 4A Champion (highest level)
            else if (classification === "3A")
              nchsaaScore += 12 // 3A Champion
            else if (classification === "2A")
              nchsaaScore += 10 // 2A Champion
            else if (classification === "1A") nchsaaScore += 8 // 1A Champion
          } else if (place <= 4) {
            // State Placer (2nd-4th place)
            if (classification === "4A")
              nchsaaScore += 8 // 4A Placer
            else if (classification === "3A")
              nchsaaScore += 6 // 3A Placer
            else if (classification === "2A")
              nchsaaScore += 5 // 2A Placer
            else if (classification === "1A") nchsaaScore += 4 // 1A Placer
          }
        }
      }

      breakdown.nchsaa = Math.min(nchsaaScore, 15)
      totalScore += breakdown.nchsaa

      const finalScore = Math.round(totalScore * 10) / 10
      console.log("[v0] Final score for", athlete.name, ":", finalScore, "breakdown:", breakdown)

      return {
        ...athlete,
        recruitnc_score: finalScore,
        score_breakdown: breakdown,
      }
    })

    // Sort by score and assign rankings
    const rankedAthletes = scoredAthletes
      .sort((a, b) => b.recruitnc_score - a.recruitnc_score)
      .map((athlete, index) => ({
        ...athlete,
        calculated_rank: index + 1,
      }))

    console.log("[v0] Successfully calculated scores for", rankedAthletes.length, "athletes")

    return NextResponse.json({
      success: true,
      athletes: rankedAthletes,
      message: `Calculated RecruitNC scores for ${rankedAthletes.length} athletes`,
    })
  } catch (error) {
    console.error("[v0] Error calculating RecruitNC scores:", error)
    return NextResponse.json(
      {
        error: "Failed to calculate scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
