import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { loadProfileTournamentData } from "@/lib/profile-tournament-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Bio generation started for athlete:", params.id)

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] Bio generation error: OPENAI_API_KEY environment variable is not set")
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Fetch athlete data
    const { data: athlete, error } = await supabase.from("athletes").select("*").eq("id", params.id).single()

    if (error || !athlete) {
      console.error("[v0] Bio generation error: Athlete not found", error)
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const gradYear = Number(athlete.graduation_year) || new Date().getFullYear()
    const tournamentData = await loadProfileTournamentData(supabase, {
      id: athlete.id,
      name: athlete.name,
      highschool: athlete.highschool,
      graduationyear: gradYear,
    })
    const nchsaaResults = tournamentData.nchsaa
    const nhscaResults = tournamentData.nhsca

    console.log("[v0] Bio generation: NCHSAA results count:", nchsaaResults?.length || 0)
    console.log("[v0] Bio generation: NHSCA results count:", nhscaResults?.length || 0)

    const formatNchsaaResults = (results: any[]) => {
      if (!results || results.length === 0) return "No NCHSAA state tournament results"
      return results
        .map((r) => `${r.year} NCHSAA State ${r.classification}: ${r.place} place at ${r.weight_class ?? r.weight ?? ""}lbs`)
        .join(", ")
    }

    const formatNhscaResults = (results: any[]) => {
      if (!results || results.length === 0) return "No NHSCA national tournament results"
      return results.map((r) => `${r.year} NHSCA Nationals: ${r.placement} place at ${(r as any).weight ?? ""}lbs`).join(", ")
    }

    // Prepare athlete data for AI analysis
    const formattedNchsaa = formatNchsaaResults(nchsaaResults || [])
    const formattedNhsca = formatNhscaResults(nhscaResults)

    const athleteData = {
      name: athlete.name,
      graduationYear: athlete.graduation_year,
      weightClass: athlete.weightclass,
      highSchool: athlete.highschool,
      wrestlingClub: athlete.wrestlingClub,
      gpa: athlete.academic_gpa,
      sat: athlete.academic_sat,
      act: athlete.academic_act,
      achievements: athlete.achievements,
      additionalAchievements: athlete.additional_achievements,
      committedSchool: athlete.committed_school,
      commitmentYear: athlete.commitment_year,
      nchsaaResults: formattedNchsaa,
      nhscaResults: formattedNhsca,
      nhsca_2024: {
        record: athlete.nhsca_2024_record,
        placement: athlete.nhsca_2024_placement,
      },
      nhsca_2025: {
        record: athlete.nhsca_2025_record,
        placement: athlete.nhsca_2025_placement,
      },
      super32_2024: {
        record: athlete.super_32_2024_record,
        placement: athlete.super_32_2024_placement,
      },
      super32_2025: {
        record: athlete.super_32_2025_record,
        placement: athlete.super_32_2025_placement,
      },
      super32_2023: {
        record: athlete.super_32_2023_record,
        placement: athlete.super_32_2023_placement,
      },
      ncUnitedTeam: athlete.ncUnitedTeam,
      nationallyRankedWins: athlete.nationally_ranked_wins,
      collegeOpens: athlete.college_opens_experience,
    }

    const currentYear = new Date().getFullYear()
    const hasGraduated = athleteData.graduationYear && athleteData.graduationYear <= currentYear

    const generateHeadline = (athleteData: any, nchsaaResults: any[], nhscaResults: any[]) => {
      const titles = []

      if (nchsaaResults && nchsaaResults.length > 0) {
        const hasStateTitle = nchsaaResults.some((r) => r.place === "1st" || r.place === "1")
        const hasStatePlacement = nchsaaResults.some((r) => Number.parseInt(r.place) <= 8)

        if (hasStateTitle) {
          titles.push("State Champion")
        } else if (hasStatePlacement) {
          titles.push("State Placer")
        }
      }

      if (nhscaResults && nhscaResults.length > 0) {
        const hasAllAmerican = nhscaResults.some((r) => {
          const placement = Number.parseInt(r.placement)
          return placement <= 8
        })

        if (hasAllAmerican) {
          titles.push("NHSCA All-American")
        }
      }

      const titleString = titles.length > 0 ? ` — ${titles.join(" & ")}` : ""
      if (hasGraduated && athleteData.committedSchool) {
        return `${athleteData.name}, ${athleteData.highSchool} → ${athleteData.committedSchool}${titleString}`
      }
      return `${athleteData.name}, ${athleteData.highSchool}${titleString}`
    }

    const headline = generateHeadline(athleteData, nchsaaResults || [], nhscaResults || [])
    console.log("[v0] Bio generation: Generated headline:", headline)

    const prompt = hasGraduated
      ? `Create a factual 2-3 sentence bio for this graduated high school wrestler summarizing their career and college commitment. Use only verifiable facts and achievements - no promotional language or subjective adjectives like "standout", "impressive", "dominant", etc.

Athlete Data:
${JSON.stringify(athleteData, null, 2)}

Write a factual bio that includes:
- NCHSAA state tournament placements (specific year, classification, place, weight)
- NHSCA national tournament results (year, placement, weight)
- Super 32 tournament results if available
- College commitment to ${athleteData.committedSchool || "their college program"}
- Academic metrics (GPA, SAT, ACT) if available
- Nationally ranked wins if documented
- Additional achievements and other notable accomplishments
- NC United Blue/Gold team membership if applicable

Use past tense for high school achievements. State facts directly without embellishment. Example: "Placed 3rd at 2024 NCHSAA 3A State Championships at 157lbs" not "had an impressive 3rd place finish".

Return ONLY the bio paragraph, no headline or additional formatting.`
      : `Create a factual 2-3 sentence bio for this high school wrestler using only verifiable achievements and data. Avoid promotional language and subjective adjectives like "standout", "impressive", "dominant", "promising", etc. Stick to facts.

Athlete Data:
${JSON.stringify(athleteData, null, 2)}

Write a factual bio that includes:
- NCHSAA state tournament placements (specific year, classification, place, weight)
- NHSCA national tournament results (year, placement, weight, record if available)
- Super 32 tournament results (year, placement, record if available)
- College opens experience if documented
- Academic metrics (GPA, SAT, ACT) if available
- Nationally ranked wins if documented
- Additional achievements from the additionalAchievements field
- Other notable accomplishments
- NC United Blue membership if applicable

State facts directly without embellishment. Example: "Placed 2nd at 2025 NHSCA Nationals at 144lbs with a 5-1 record" not "earned an impressive runner-up finish". List achievements chronologically or by importance.

Return ONLY the bio paragraph, no headline or additional formatting.`

    console.log("[v0] Bio generation: Calling OpenAI API")

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a factual sports writer who creates concise, data-driven athlete bios without promotional language or subjective adjectives.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error("[v0] Bio generation error: OpenAI API failed", errorData)
      return NextResponse.json(
        { error: "OpenAI API request failed", details: errorData },
        { status: openaiResponse.status },
      )
    }

    const openaiData = await openaiResponse.json()
    const generatedBio = openaiData.choices?.[0]?.message?.content?.trim()

    console.log("[v0] Bio generation: Generated bio length", generatedBio?.length || 0)

    if (!generatedBio) {
      console.error("[v0] Bio generation error: No bio content generated")
      return NextResponse.json({ error: "No bio content generated" }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("athletes")
      .update({
        bio: generatedBio,
        bio_headline: headline,
      })
      .eq("id", params.id)

    if (updateError) {
      console.error("[v0] Bio generation error: Failed to save bio", updateError)
      return NextResponse.json({ error: "Failed to save bio to database" }, { status: 500 })
    }

    console.log("[v0] Bio generation: Successfully completed for", athlete.name)
    return NextResponse.json({ bio: generatedBio, headline })
  } catch (error) {
    console.error("[v0] Bio generation error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate bio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
