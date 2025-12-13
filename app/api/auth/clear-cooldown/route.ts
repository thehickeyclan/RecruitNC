import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Delete the rate limit cooldown cookie
    cookieStore.delete("rate_limit_cooldown")
    
    // Also try to set it to expired
    cookieStore.set("rate_limit_cooldown", "", {
      maxAge: 0,
      path: "/",
      expires: new Date(0),
    })

    return NextResponse.json({ 
      success: true,
      message: "Cooldown cleared successfully" 
    })
  } catch (error: any) {
    console.error("Error clearing cooldown:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to clear cooldown" 
      },
      { status: 500 }
    )
  }
}

