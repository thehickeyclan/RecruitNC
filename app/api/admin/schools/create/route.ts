import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

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

    // Insert school into database
    const { data, error } = await supabase
      .from("schools")
      .insert({
        name,
        logo_url: finalLogoUrl || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
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
