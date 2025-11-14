import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: Request) {
  try {
    // Revalidate the athletes page
    revalidatePath("/athletes")

    // Also revalidate the root page which might show athletes
    revalidatePath("/")

    return NextResponse.json({
      success: true,
      message: "Cache cleared for athletes pages",
    })
  } catch (error) {
    console.error("Error clearing cache:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear cache",
      },
      { status: 500 },
    )
  }
}
