import { NextRequest, NextResponse } from "next/server"
import { QueryHandler } from "./index"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { getSchoolsByClassification } from "@/lib/classification-data"

export const handleDivisionRegion: QueryHandler = async (params, request, messageId) => {
  console.log("[Division/Region Handler] ===== ENTRY =====")
  console.log("[Division/Region Handler] Params received:", JSON.stringify(params))
  
  const userQuery = (params.query || params.search || params.division || params.region || "").toLowerCase()
  console.log("[Division/Region Handler] User query:", userQuery)
  
  try {
    const adminClient = getSupabaseAdmin()
    
    // Parse division and region from query
    // Patterns: "6a", "7a", "5a east", "4A West", "what teams are in 3a", "list all 8a teams"
    const divisionMatch = userQuery.match(/(\d+)\s*a/i)
    let division: string | null = null
    let region: string | null = null
    
    if (divisionMatch) {
      const divNum = divisionMatch[1]
      division = `${divNum}A`
      console.log("[Division/Region Handler] Detected division:", division)
      
      // Check for region (east/west)
      if (userQuery.includes("east")) {
        region = "East"
        console.log("[Division/Region Handler] Detected region: East")
      } else if (userQuery.includes("west")) {
        region = "West"
        console.log("[Division/Region Handler] Detected region: West")
      }
    }
    
    if (!division) {
      console.log("[Division/Region Handler] No division detected in query")
      return {
        directResponse: NextResponse.json({
          answer: "I couldn't determine which division you're asking about. Please specify a division like '6A', '7A', or '5A East'.",
          messageId: messageId || `msg-${Date.now()}`,
        }),
      }
    }
    
    console.log("[Division/Region Handler] Querying school_classifications table...")
    console.log("[Division/Region Handler] Division:", division, "Region:", region || "all")
    
    // Query school_classifications table
    let query = adminClient
      .from("school_classifications")
      .select("school_name, classification, region, enrollment, effective_year")
      .eq("classification", division)
      .order("school_name", { ascending: true })
    
    if (region) {
      // Filter by region if specified
      query = query.ilike("region", `%${region}%`)
    }
    
    let { data: schools, error } = await query
    
    console.log("[Division/Region Handler] Query result - found", schools?.length || 0, "schools")
    if (error) {
      console.error("[Division/Region Handler] Database error:", error)
      return {
        directResponse: NextResponse.json({
          answer: `Database error: ${error.message}`,
          messageId: messageId || `msg-${Date.now()}`,
        }),
      }
    }

    // Fallback: if DB returns 0, use static classificationData (no region - returns all in class)
    if (!schools || schools.length === 0) {
      const staticSchools = getSchoolsByClassification(division)
      if (staticSchools.length > 0) {
        schools = staticSchools.map((name) => ({
          school_name: name,
          classification: division,
          region: region,
          enrollment: undefined,
        }))
        console.log("[Division/Region Handler] Using static fallback:", schools.length, "schools")
      }
    }
    
    if (!schools || schools.length === 0) {
      const regionText = region ? ` ${region}` : ""
      console.log("[Division/Region Handler] No schools found")
      return {
        directResponse: NextResponse.json({
          answer: `I couldn't find any teams in ${division}${regionText}.`,
          messageId: messageId || `msg-${Date.now()}`,
        }),
      }
    }
    
    console.log("[Division/Region Handler] Formatting response...")
    
    // Format the response
    const regionText = region ? ` ${region}` : ""
    let answer = `Here are all the teams in **${division}${regionText}** (${schools.length} teams):\n\n`
    
    // Group by region if no specific region was requested
    if (!region && schools.some((s: any) => s.region)) {
      const byRegion: Record<string, any[]> = {}
      schools.forEach((school: any) => {
        const schoolRegion = school.region || "Unknown"
        if (!byRegion[schoolRegion]) {
          byRegion[schoolRegion] = []
        }
        byRegion[schoolRegion].push(school)
      })
      
      // Sort regions (East before West)
      const sortedRegions = Object.keys(byRegion).sort((a, b) => {
        if (a.includes("East")) return -1
        if (b.includes("East")) return 1
        return a.localeCompare(b)
      })
      
      sortedRegions.forEach((regionName) => {
        answer += `**${regionName}** (${byRegion[regionName].length} teams):\n`
        byRegion[regionName].forEach((school: any) => {
          answer += `- ${school.school_name}`
          if (school.enrollment) {
            answer += ` — ${school.enrollment}`
          }
          answer += "\n"
        })
        answer += "\n"
      })
    } else {
      // List all schools in order
      schools.forEach((school: any, index: number) => {
        answer += `${index + 1}. ${school.school_name}`
        if (school.enrollment) {
          answer += ` — ${school.enrollment}`
        }
        if (school.region && !region) {
          answer += ` (${school.region})`
        }
        answer += "\n"
      })
    }
    
    console.log("[Division/Region Handler] Response formatted, length:", answer.length)
    
    return {
      results: schools.map((s: any) => ({
        school_name: s.school_name,
        classification: s.classification,
        region: s.region,
        enrollment: s.enrollment,
      })),
      aggregateResult: {
        division,
        region: region || "all",
        count: schools.length,
        schools: schools.map((s: any) => s.school_name),
      },
      answer: answer,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err ?? "Unknown error")
    console.error("[Division/Region Handler] Exception:", err)
    return {
      directResponse: NextResponse.json({
        answer: `I had trouble looking up schools in that classification and region. ${msg}. Please try again.`,
        messageId: messageId || `msg-${Date.now()}`,
      }),
    }
  }
}
