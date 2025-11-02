import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Try to read from the test table we just created
    const { data, error } = await supabase
      .from("connection_test")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      return Response.json(
        {
          success: false,
          error: "Cannot access connection_test table",
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 400 },
      )
    }

    return Response.json({
      success: true,
      message: "✅ CONNECTION VALIDATED!",
      data: data,
      note: "API can successfully read from your database",
    })
  } catch (error) {
    console.error("Connection validation error:", error)
    return Response.json(
      {
        error: "Failed to validate connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
