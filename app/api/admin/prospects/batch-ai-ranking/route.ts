import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { year, gender, suggestionsOnly = false } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const supabase = createClient()

    const { data: athletes, error } = await supabase
      .from("athletes")
      .select(`
        id, name, graduationyear, highschool, weightclass, academic_gpa,
        nhsca_2024_record, nhsca_2024_placement, nhsca_2025_record, nhsca_2025_placement,
        super_32_2024_record, super_32_2024_placement, super_32_2025_record, super_32_2025_placement,
        nationally_ranked_wins, additional_achievements, achievements, college
      `)
      .eq("graduationyear", year)
      .eq("gender", gender)
      .order("prospect_ranking", { ascending: true, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: "Database query failed", details: error.message }, { status: 500 })
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({ error: "No athletes found for ranking" }, { status: 400 })
    }

    // Prepare athlete data for AI analysis
    const athleteProfiles = athletes.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      school: athlete.highschool,
      weight: athlete.weightclass,
      gpa: athlete.academic_gpa,
      nhsca2024: athlete.nhsca_2024_record
        ? `${athlete.nhsca_2024_record} (${athlete.nhsca_2024_placement || "No placement"})`
        : null,
      nhsca2025: athlete.nhsca_2025_record
        ? `${athlete.nhsca_2025_record} (${athlete.nhsca_2025_placement || "No placement"})`
        : null,
      super322024: athlete.super_32_2024_record
        ? `${athlete.super_32_2024_record} (${athlete.super_32_2024_placement || "No placement"})`
        : null,
      super322025: athlete.super_32_2025_record
        ? `${athlete.super_32_2025_record} (${athlete.super_32_2025_placement || "No placement"})`
        : null,
      rankedWins: athlete.nationally_ranked_wins || 0,
      achievements: athlete.achievements || [],
      additionalAchievements: athlete.additional_achievements || "",
      committed: athlete.college ? true : false,
    }))

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert wrestling analyst. Analyze these wrestlers and assign numerical rankings from #1 to #${Math.min(athletes.length, 25)}. Prioritize state champions, national tournament placers, and wrestlers with quality wins. Return ONLY a JSON array in this exact format: [{"id": "wrestler-id", "ranking": 1}, {"id": "wrestler-id", "ranking": 2}]`,
          },
          {
            role: "user",
            content: `Rank these ${year} ${gender} wrestlers based on their wrestling accomplishments:\n\n${JSON.stringify(athleteProfiles, null, 2)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `OpenAI API error: ${response.status}` }, { status: 500 })
    }

    const aiResult = await response.json()

    if (!aiResult.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: "Invalid OpenAI response" }, { status: 500 })
    }

    let rankings
    try {
      const content = aiResult.choices[0].message.content.trim()
      rankings = JSON.parse(content)
    } catch (parseError) {
      return NextResponse.json({ error: "Failed to parse AI response as JSON" }, { status: 500 })
    }

    if (!Array.isArray(rankings)) {
      return NextResponse.json({ error: "AI response is not an array" }, { status: 500 })
    }

    if (!suggestionsOnly) {
      try {
        for (const { id, ranking } of rankings) {
          const { error: updateError } = await supabase
            .from("athletes")
            .update({ prospect_ranking: ranking })
            .eq("id", id)

          if (updateError) {
            throw updateError
          }
        }
      } catch (updateError) {
        return NextResponse.json({ error: "Failed to update rankings", details: updateError.message }, { status: 500 })
      }
    }

    if (suggestionsOnly) {
      return NextResponse.json({
        success: true,
        message: `Generated AI suggestions for ${rankings.length} wrestlers`,
        rankings: rankings.map(({ id, ranking }) => ({
          id,
          suggested_ranking: ranking,
        })),
      })
    } else {
      return NextResponse.json({
        success: true,
        message: `Successfully ranked ${rankings.length} wrestlers`,
        rankings,
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate AI rankings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
