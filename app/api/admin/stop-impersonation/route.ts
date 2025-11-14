import { NextResponse } from "next/server"

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Impersonation stopped",
    })

    response.cookies.delete("impersonating_profile_id")
    response.cookies.delete("impersonating_email")

    return response
  } catch (error: any) {
    console.error("[v0] Stop impersonation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
