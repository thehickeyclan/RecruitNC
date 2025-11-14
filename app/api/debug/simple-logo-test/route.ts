import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("type") || "highschool"
    const entityName = searchParams.get("name") || "Cardinal Gibbons High School"

    console.log(`🔍 Testing logo fetch for ${entityType}: ${entityName}`)

    const { data, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_name", entityName)
      .single()

    if (error) {
      console.log("❌ Database error:", error)
      return NextResponse.json({ success: false, error: error.message })
    }

    if (data) {
      console.log("✅ Found logo:", data)
      return NextResponse.json({
        success: true,
        logo_url: data.logo_url,
        matched_name: data.entity_name,
        matched_type: data.entity_type,
        full_data: data,
      })
    }

    return NextResponse.json({ success: false, error: "No logo found" })
  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
