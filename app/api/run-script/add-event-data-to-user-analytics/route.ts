import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("Auth error:", authError)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("User authenticated:", user.email)

    // For now, let's allow any authenticated user to run this
    // Check if user_analytics table exists first
    const { data: testAnalytics, error: testError } = await supabase.from("user_analytics").select("id").limit(1)

    if (testError && testError.message.includes('relation "user_analytics" does not exist')) {
      return NextResponse.json(
        {
          error: "user_analytics table doesn't exist. Please create it first.",
          suggestion: "Run the create-user-analytics-table script first",
        },
        { status: 500 },
      )
    }

    // Try to select event_data to see if column exists
    const { data: testEventData, error: eventDataError } = await supabase
      .from("user_analytics")
      .select("id, event_data")
      .limit(1)

    if (eventDataError && eventDataError.message.includes('column "event_data" does not exist')) {
      return NextResponse.json(
        {
          error: "Column doesn't exist yet. Please run the SQL manually in Supabase dashboard.",
          sql: `
ALTER TABLE user_analytics 
ADD COLUMN IF NOT EXISTS event_data JSONB;

CREATE INDEX IF NOT EXISTS idx_user_analytics_event_data ON user_analytics USING GIN (event_data);

CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
        `,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Event data column setup completed (or already exists)",
      testData: testEventData,
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json({ error: "Internal server error: " + error }, { status: 500 })
  }
}
