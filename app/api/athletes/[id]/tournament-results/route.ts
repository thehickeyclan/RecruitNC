import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const athleteId = params.id
    const body = await request.json()

    console.log("[Tournament Results] Updating for athlete:", athleteId)
    console.log("[Tournament Results] NHSCA:", body.nhsca_results)
    console.log("[Tournament Results] Super32:", body.super32_results)

    const { data, error } = await supabase
      .from("athletes")
      .update({
        nhsca_results: body.nhsca_results || [],
        super32_results: body.super32_results || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", athleteId)
      .select()

    if (error) {
      console.error("[Tournament Results] Update error:", error)
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      )
    }

    console.log("[Tournament Results] Update successful")
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[Tournament Results] API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update tournament results" },
      { status: 500 }
    )
  }
}

