import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface RankingSuggestion {
  athlete_id: string
  athlete_name: string
  current_ranking: number | null
  suggested_ranking: number
  confidence_score: number
  reasoning: string[]
  match_performance: any
  academic_metrics: any
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const graduationYear = searchParams.get("year")
    const gender = searchParams.get("gender")

    if (!graduationYear || !gender) {
      return NextResponse.json({ error: "Graduation year and gender are required" }, { status: 400 })
    }

    // Get prospects with match data and academic info
    const { data: prospects, error: prospectsError } = await supabase
      .from("athletes")
      .select(`
        id,
        name,
        firstName,
        lastName,
        graduationyear,
        gender,
        weightclass,
        prospect_ranking,
        academic_gpa,
        academic_sat,
        academic_act,
        achievements,
        matches (
          wins,
          losses,
          pins,
          tech_falls,
          major_decisions,
          decisions,
          total_matches,
          pin_percentage,
          tf_percentage,
          finishing_percentage
        )
      `)
      .eq("is_prospect", true)
      .eq("graduationyear", Number.parseInt(graduationYear))
      .ilike("gender", gender)

    if (prospectsError) {
      console.error("Error fetching prospects:", prospectsError)
      return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 })
    }

    // Generate ranking suggestions based on multiple factors
    const suggestions: RankingSuggestion[] = prospects.map((prospect) => {
      const reasoning: string[] = []
      let baseScore = 50 // Start with middle ranking
      let confidence = 0.5

      // Academic performance factor (30% weight)
      if (prospect.academic_gpa) {
        const gpaScore = (prospect.academic_gpa / 4.0) * 30
        baseScore += gpaScore
        confidence += 0.2
        reasoning.push(
          `GPA: ${prospect.academic_gpa.toFixed(2)} (${gpaScore > 22 ? "Strong" : gpaScore > 15 ? "Good" : "Needs improvement"} academic performance)`,
        )
      }

      // Match performance factor (40% weight)
      if (prospect.matches && prospect.matches.length > 0) {
        const matchData = prospect.matches[0] // Most recent season
        if (matchData.total_matches > 0) {
          const winPercentage = matchData.wins / matchData.total_matches
          const finishingRate = matchData.finishing_percentage || 0

          const matchScore = winPercentage * 25 + finishingRate * 15
          baseScore += matchScore
          confidence += 0.3

          reasoning.push(
            `Match Record: ${matchData.wins}-${matchData.losses} (${(winPercentage * 100).toFixed(1)}% win rate)`,
          )
          if (finishingRate > 0) {
            reasoning.push(
              `Finishing Rate: ${finishingRate.toFixed(1)}% (${finishingRate > 50 ? "Excellent" : finishingRate > 30 ? "Good" : "Developing"} finishing ability)`,
            )
          }
        }
      }

      // Achievement factor (30% weight)
      if (prospect.achievements && prospect.achievements.length > 0) {
        let achievementScore = 0
        prospect.achievements.forEach((achievement: string) => {
          const lower = achievement.toLowerCase()
          if (lower.includes("state champion") || lower.includes("1st place")) {
            achievementScore += 15
            reasoning.push(`State Champion achievement`)
          } else if (lower.includes("state") && (lower.includes("2nd") || lower.includes("runner"))) {
            achievementScore += 12
            reasoning.push(`State Runner-up achievement`)
          } else if (lower.includes("state") && lower.includes("place")) {
            achievementScore += 8
            reasoning.push(`State Placer achievement`)
          } else if (lower.includes("regional") || lower.includes("conference")) {
            achievementScore += 5
            reasoning.push(`Regional/Conference achievement`)
          }
        })
        baseScore += Math.min(achievementScore, 30) // Cap at 30 points
        confidence += 0.2
      }

      // Convert score to ranking (lower score = higher ranking)
      const suggestedRanking = Math.max(1, Math.min(100, Math.round(101 - baseScore)))

      // Adjust confidence based on data availability
      if (!prospect.matches || prospect.matches.length === 0) {
        confidence -= 0.3
        reasoning.push("Limited match data available")
      }
      if (!prospect.academic_gpa) {
        confidence -= 0.2
        reasoning.push("Academic data not available")
      }

      return {
        athlete_id: prospect.id,
        athlete_name: prospect.name,
        current_ranking: prospect.prospect_ranking,
        suggested_ranking: suggestedRanking,
        confidence_score: Math.max(0.1, Math.min(1.0, confidence)),
        reasoning,
        match_performance: prospect.matches?.[0] || null,
        academic_metrics: {
          gpa: prospect.academic_gpa,
          sat: prospect.academic_sat,
          act: prospect.academic_act,
        },
      }
    })

    // Sort by suggested ranking
    suggestions.sort((a, b) => a.suggested_ranking - b.suggested_ranking)

    // Only return suggestions where there's a significant change or high confidence
    const significantSuggestions = suggestions.filter((suggestion) => {
      if (!suggestion.current_ranking) return suggestion.confidence_score > 0.6
      const rankingDifference = Math.abs(suggestion.current_ranking - suggestion.suggested_ranking)
      return rankingDifference >= 3 || suggestion.confidence_score > 0.8
    })

    return NextResponse.json({
      suggestions: significantSuggestions,
      total_analyzed: prospects.length,
      significant_changes: significantSuggestions.length,
    })
  } catch (error) {
    console.error("Error generating ranking suggestions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
