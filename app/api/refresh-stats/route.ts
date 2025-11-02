import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    // Revalidate the home page
    revalidatePath("/")

    // Revalidate the stats page if you have one
    revalidatePath("/stats")

    return NextResponse.json({
      success: true,
      message: "Stats refreshed successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error refreshing stats:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to refresh stats",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
