import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getNCHSAAResultsForProfile } from "@/lib/nchsaa-results"
import { getNHSCAFromTables } from "@/lib/tournament-tables"

export async function POST(request: NextRequest) {
  try {
    const { athleteId } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch comprehensive athlete data
    const { data: athlete, error } = await supabase
      .from("athletes")
      .select(`
        id, name, graduationyear, weightclass, highschool, division,
        academic_gpa, nationally_ranked_wins, recruiting_status,
        nhsca_2024_placement, nhsca_2025_placement, nhsca_2024_record, nhsca_2025_record,
        super_32_2024_placement, super_32_2025_placement, super_32_2024_record, super_32_2025_record,
        achievements, additional_achievements
      `)
      .eq("id", athleteId)
      .single()

    if (error || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
    const [nchsaaRows, nhscaRows] = await Promise.all([
      getNCHSAAResultsForProfile(supabase, (athlete.name ?? "").trim(), gradYear),
      getNHSCAFromTables(supabase, (athlete.name ?? "").trim(), gradYear),
    ])
    const nchsaaResults = nchsaaRows
    const nhscaResults = nhscaRows.map((r) => ({ year: r.year, placement: r.placement, division: r.division, weight: r.weight }))

    // Generate AI ranking analysis
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert wrestling analyst who evaluates high school wrestlers for national rankings. Analyze the provided data and suggest a ranking from 1-25 (or "Unranked" if not top 25 caliber).

Consider these factors in order of importance:
1. State tournament placements (1st = State Champion, 2nd-3rd = State Medalist, 4th-8th = State Placer)
2. NHSCA national tournament results (top 8 placements are significant)
3. Super 32 performance (elite national tournament)
4. Nationally ranked wins (quality victories)
5. Academic performance (GPA 3.5+ is notable)
6. Weight class competitiveness
7. School division level

Respond with ONLY a number (1-25) or "Unranked". No explanation needed.`,
          },
          {
            role: "user",
            content: `Analyze this wrestler for national ranking:

ATHLETE: ${athlete.name}
Class of: ${athlete.graduationyear}
Weight: ${athlete.weightclass} lbs
High School: ${athlete.highschool} (${athlete.division || "Unknown Division"})
GPA: ${athlete.academic_gpa || "Not provided"}

STATE TOURNAMENT RESULTS (NCHSAA):
${nchsaaResults?.map((r) => `${r.year}: ${r.place}${r.place === 1 ? "st" : r.place === 2 ? "nd" : r.place === 3 ? "rd" : "th"} place in ${r.classification} at ${r.weight_class ?? ""} lbs`).join("\n") || "No state results found"}

NATIONAL TOURNAMENT RESULTS (NHSCA):
${nhscaResults?.map((r) => `${r.year}: ${r.placement} in ${r.division} at ${r.weight} lbs`).join("\n") || "No NHSCA results found"}

SUPER 32 PERFORMANCE:
2024: ${athlete.super_32_2024_placement ? `${athlete.super_32_2024_placement} place` : "No placement"} | Record: ${athlete.super_32_2024_record || "Not provided"}
2025: ${athlete.super_32_2025_placement ? `${athlete.super_32_2025_placement} place` : "No placement"} | Record: ${athlete.super_32_2025_record || "Not provided"}

NHSCA PERFORMANCE:
2024: ${athlete.nhsca_2024_placement ? `${athlete.nhsca_2024_placement} place` : "No placement"} | Record: ${athlete.nhsca_2024_record || "Not provided"}
2025: ${athlete.nhsca_2025_placement ? `${athlete.nhsca_2025_placement} place` : "No placement"} | Record: ${athlete.nhsca_2025_record || "Not provided"}

NATIONALLY RANKED WINS: ${athlete.nationally_ranked_wins || 0}

OTHER ACHIEVEMENTS: ${athlete.achievements || "None listed"}
ADDITIONAL ACHIEVEMENTS: ${athlete.additional_achievements || "None listed"}

RECRUITING STATUS: ${athlete.recruiting_status || "Uncommitted"}`,
          },
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    })

    const openaiData = await response.json()
    const aiRank = openaiData.choices?.[0]?.message?.content?.trim() || "Unranked"

    return NextResponse.json({
      athleteId,
      aiRank,
      analysis: "AI ranking generated successfully",
    })
  } catch (error) {
    console.error("AI ranking error:", error)
    return NextResponse.json({ error: "Failed to generate AI ranking" }, { status: 500 })
  }
}
