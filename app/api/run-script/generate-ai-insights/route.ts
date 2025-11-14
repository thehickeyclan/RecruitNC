import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    // Generate some sample insights
    const insights = [
      {
        category: "trend",
        text: "Division I commitments are up 15% this year compared to last year",
        filters: { division: "Division I" },
        icon: "📈",
      },
      {
        category: "recognition",
        text: "NC State leads all colleges with the most NC United athlete commitments",
        filters: { college: "NC State" },
        icon: "🎓",
      },
      {
        category: "shoutout",
        text: "Congratulations to all our 2025 graduates on their college commitments!",
        filters: { graduationyear: 2025 },
        icon: "🎉",
      },
    ]

    const { error } = await supabase.from("ai_insights").insert(insights)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${insights.length} AI insights successfully`,
    })
  } catch (error) {
    console.error("Error generating AI insights:", error)
    return NextResponse.json({ error: "Failed to generate AI insights" }, { status: 500 })
  }
}
