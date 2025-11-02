import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("=== CHECKING MATCHES TABLE ACCESS ===")

    // Try to query the matches table
    const { data, error, count } = await supabase.from("matches").select("*", { count: "exact" }).limit(1)

    if (error) {
      console.error("Table access error:", error)
      return Response.json({
        success: false,
        error: "Cannot access matches table",
        details: error.message,
        code: error.code,
        hint: error.hint,
      })
    }

    console.log("Table access successful! Record count:", count)

    return Response.json({
      success: true,
      message: "✅ Matches table is accessible and ready for uploads",
      record_count: count,
      sample_data: data,
    })
  } catch (error) {
    console.error("Check error:", error)
    return Response.json({
      success: false,
      error: "Cannot check table structure",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
