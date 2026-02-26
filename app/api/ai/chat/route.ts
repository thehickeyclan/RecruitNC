// RecruitNC Proxy Endpoint Example
// File: app/api/ai/chat/route.ts in RecruitNC project
//
// This proxy forwards requests to LegacyNC's API endpoint.
// Since both projects share the same database, LegacyNC can handle all queries.
// The proxy ensures project: "recruit-nc" is set so LegacyNC uses the correct system prompt.

import { NextRequest, NextResponse } from "next/server"

/** Plausible NCHSAA years for a grad year (high school: gradYear-4 through gradYear). */
const MIN_YEAR = 1990
const MAX_YEAR = 2035

/**
 * Strip NCHSAA result lines for years outside the athlete's plausible window (gradYear-4 .. gradYear)
 * so we don't show another person's results (e.g. two "Jacob Perry" — class of 2028 should not show 2022/2023).
 * Only runs inside the "NCHSAA State Results" section. Infers grad year from "Class of 20XX" or from latest NCHSAA year + 2.
 */
function stripImpossibleNchsaaYears(answer: string): string {
  const nchsaaBlock = answer.match(/((🏆\s*)?NCHSAA\s+State\s+Results\s*:?\s*\n)([\s\S]*?)(?=\n\s*(🏆|Super32|NHSCA|National Team|Career|High School Career|🇺🇸|\n\n\s*[A-Z])|$)/i)
  if (!nchsaaBlock) return answer

  const [, header, , sectionContent] = nchsaaBlock
  const classMatch = answer.match(/\b[Cc]lass\s+of\s+(20\d{2})\b/)
  let gradYear: number | null = classMatch ? parseInt(classMatch[1], 10) : null
  if (!gradYear && sectionContent) {
    const yearMatches = sectionContent.match(/^\s*[-•*]\s*(20\d{2})\s*:/gm)
    if (yearMatches?.length) {
      const maxY = Math.max(...yearMatches.map((m) => parseInt(m.replace(/\D/g, "").slice(0, 4), 10)))
      gradYear = maxY + 2
    }
  }
  if (!gradYear || gradYear < 2000 || gradYear > 2040) return answer

  const minYear = Math.max(MIN_YEAR, gradYear - 4)
  const maxYear = Math.min(MAX_YEAR, gradYear)

  const filtered = sectionContent
    .replace(/^(\s*[-•*]\s*)(20\d{2})(\s*:\s*[^\n]*)/gm, (match, _p, yearStr) => {
      const y = parseInt(yearStr, 10)
      return y >= minYear && y <= maxYear ? match : ""
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  const fullBlock = nchsaaBlock[0]
  const newBlock = header + filtered
  return answer.replace(fullBlock, newBlock).replace(/\n{3,}/g, "\n\n").trim()
}

// LegacyNC API URL - set this in RecruitNC's environment variables
// For local dev: http://localhost:3000
// For production: https://your-legacy-nc-domain.com
const LEGACY_NC_API_URL = process.env.LEGACY_NC_API_URL || process.env.NEXT_PUBLIC_LEGACY_NC_API_URL || "http://localhost:3000"

export async function POST(request: NextRequest) {
  try {
    // Get the request body from RecruitNC
    const body = await request.json()
    
    // Ensure project is set to "recruit-nc" (component should do this, but ensure it)
    // This tells LegacyNC to use the RecruitNC system prompt
    const requestBody = {
      ...body,
      project: body.project || "recruit-nc" // Default to recruit-nc if not set
    }
    
    console.log("[RecruitNC Proxy] Forwarding request to LegacyNC:", {
      project: requestBody.project,
      messageLength: requestBody.message?.length || 0
    })
    
    // Forward request to LegacyNC API
    // This is a server-to-server request, so no CORS issues
    const response = await fetch(`${LEGACY_NC_API_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any auth headers if needed (for future use)
        ...(request.headers.get("authorization") && {
          authorization: request.headers.get("authorization") || ""
        })
      },
      body: JSON.stringify(requestBody),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("[RecruitNC Proxy] LegacyNC API error:", response.status, errorText)
      return NextResponse.json(
        { 
          error: `LegacyNC API error: ${response.status}`,
          details: errorText 
        },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    console.log("[RecruitNC Proxy] Successfully proxied response from LegacyNC")
    
    // Fix profile links and formatting in the answer
    if (data.answer) {
      // Remove NCHSAA years that are impossible for the athlete (e.g. class of 2028 should not show 2022/2023 from another person)
      data.answer = stripImpossibleNchsaaYears(data.answer)
      // Fix double "lbs" from LegacyNC (e.g. "140lbslbs" -> "140 lbs")
      data.answer = data.answer.replace(/lbslbs/gi, "lbs")
      data.answer = data.answer.replace(/(\d+)lbs(?!\s)/gi, "$1 lbs")
      // Get the current domain from the request
      const origin = request.headers.get("origin") || request.nextUrl.origin
      
      // Replace incorrect athlete profile URLs with working view-profile format
      data.answer = data.answer.replace(
        /https?:\/\/[^\s]+\/athletes\/([a-f0-9-]+)/gi,
        (_match: string, athleteId: string) => {
          return `/view-profile?id=${encodeURIComponent(athleteId)}`
        }
      )
      
      // Also fix any other legacy domain references to use view-profile
      data.answer = data.answer.replace(
        /https?:\/\/v0-new-college-commits\.vercel\.app\/[^\s)]+/gi,
        (match: string) => {
          const path = match.replace(/https?:\/\/[^\/]+/, "")
          if (path.startsWith("/athletes/")) {
            const id = path.replace("/athletes/", "")
            return `/view-profile?id=${encodeURIComponent(id)}`
          }
          if (path.startsWith("/unified-profile/")) {
            const id = path.replace("/unified-profile/", "")
            return `/view-profile?id=${encodeURIComponent(id)}`
          }
          return path
        }
      )
    }
    
    // Return the response from LegacyNC (includes answer, messageId, results, etc.)
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error("[RecruitNC Proxy] Error:", error)
    
    // Handle timeout errors
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Request to LegacyNC timed out. Please try again." },
        { status: 504 }
      )
    }
    
    // Handle network errors
    if (error.message?.includes("fetch")) {
      return NextResponse.json(
        { error: "Failed to connect to LegacyNC API. Please check your configuration." },
        { status: 502 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to proxy request to LegacyNC" },
      { status: 500 }
    )
  }
}

// Optional: Handle OPTIONS for CORS preflight (if needed for direct browser calls)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

