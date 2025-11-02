import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { jsonData } = await request.json()

    if (!jsonData) {
      return NextResponse.json({ error: "No JSON data provided" }, { status: 400 })
    }

    // Try to parse the JSON
    try {
      const parsed = JSON.parse(jsonData)
      return NextResponse.json({
        success: true,
        matchCount: parsed.matches?.length || 0,
        fixedJson: JSON.stringify(parsed, null, 2),
      })
    } catch (error) {
      // Attempt common fixes
      const fixedData = jsonData

      const fixes = [
        // Fix common quote issues
        (text: string) => {
          // Replace unescaped quotes in string values
          return text.replace(/([^\\])"/g, '$1\\"')
        },
        // Fix trailing commas
        (text: string) => text.replace(/,(\s*[}\]])/g, "$1"),
        // Fix single quotes to double quotes (but not within strings)
        (text: string) => text.replace(/'/g, '"'),
      ]

      for (const fix of fixes) {
        try {
          const attemptedFix = fix(fixedData)
          const parsed = JSON.parse(attemptedFix)
          return NextResponse.json({
            success: true,
            matchCount: parsed.matches?.length || 0,
            fixedJson: JSON.stringify(parsed, null, 2),
            appliedFix: true,
          })
        } catch (e) {
          continue
        }
      }

      // If all fixes failed
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      })
    }
  } catch (error) {
    console.error("Error in fix-json route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
