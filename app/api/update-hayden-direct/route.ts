import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "No image URL provided",
        },
        { status: 400 },
      )
    }

    const supabase = createClient()

    // Get Hayden's ID
    const { data: hayden, error: findError } = await supabase
      .from("athletes")
      .select("id")
      .eq("name", "Hayden Haynes")
      .single()

    if (findError || !hayden) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not find Hayden",
          error: findError?.message,
        },
        { status: 404 },
      )
    }

    // Update Hayden's image
    const { error: updateError } = await supabase.from("athletes").update({ photourl: imageUrl }).eq("id", hayden.id)

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update Hayden's image",
          error: updateError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's image has been updated successfully",
      athlete: {
        id: hayden.id,
        new_image_url: imageUrl,
      },
    })
  } catch (error) {
    console.error("Error updating Hayden's image:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
