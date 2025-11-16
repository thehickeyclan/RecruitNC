import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getAverageColor } from "fast-average-color-node"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const name = formData.get("name") as string
    const primaryColor = formData.get("primaryColor") as string
    const secondaryColor = formData.get("secondaryColor") as string
    const logoFile = formData.get("logo") as File | null
    const logoUrl = formData.get("logoUrl") as string | null

    if (!name) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 })
    }

    let finalLogoUrl = logoUrl || ""

    // Upload logo if provided
    if (logoFile) {
      const filename = `school-logos/${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}.${logoFile.name.split(".").pop()}`
      const blob = await put(filename, logoFile, {
        access: "public",
      })
      finalLogoUrl = blob.url
    }

    // Infer brand colors from logo when not provided
    let inferredPrimary: string | null = null
    let inferredSecondary: string | null = null
    try {
      if (finalLogoUrl && (!primaryColor || !secondaryColor)) {
        const avg = await getAverageColor(finalLogoUrl)
        if (avg?.hex) {
          inferredPrimary = avg.hex
          // pick contrasting secondary black/white using luminance
          const hex = avg.hex.replace("#", "")
          const r = parseInt(hex.slice(0, 2), 16)
          const g = parseInt(hex.slice(2, 4), 16)
          const b = parseInt(hex.slice(4, 6), 16)
          const yiq = (r * 299 + g * 587 + b * 114) / 1000
          inferredSecondary = yiq >= 150 ? "#111111" : "#FFFFFF"
        }
      }
    } catch (e) {
      console.warn("Could not infer brand colors from logo:", e)
    }

    // Insert school into database
    const { data, error } = await supabase
      .from("schools")
      .insert({
        name,
        logo_url: finalLogoUrl || null,
        // prefer explicit form colors, otherwise inferred, else null
        primary_color: (primaryColor && primaryColor.length > 0 ? primaryColor : inferredPrimary) ?? null,
        secondary_color: (secondaryColor && secondaryColor.length > 0 ? secondaryColor : inferredSecondary) ?? null,
        is_test: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating school:", error)
      return NextResponse.json({ error: "Failed to create school" }, { status: 500 })
    }

    return NextResponse.json({ success: true, school: data })
  } catch (error: any) {
    console.error("Error in create school API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
