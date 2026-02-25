import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]

/**
 * POST /api/admin/nchsaa/bracket-upload
 * Body: formData with year, classification, weight_class, file
 * Admin only. Uploads to Vercel Blob and upserts nchsaa_bracket_images.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get("file") as File
    const yearStr = formData.get("year") as string
    const classification = (formData.get("classification") as string)?.trim()
    const weightClass = (formData.get("weight_class") as string)?.trim()

    if (!file || !yearStr || !classification || !weightClass) {
      return NextResponse.json(
        { error: "Missing file, year, classification, or weight_class" },
        { status: 400 }
      )
    }

    const year = parseInt(yearStr, 10)
    if (Number.isNaN(year) || year < 1990 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const safeClassification = classification.replace(/[^a-zA-Z0-9/]/g, "_")
    const pathname = `nchsaa-brackets/${year}/${safeClassification}_${weightClass}.${ext}`

    const blob = await put(pathname, file, { access: "public" })

    const admin = createAdminClient()
    const { error } = await admin.from("nchsaa_bracket_images").upsert(
      {
        year,
        classification,
        weight_class: weightClass,
        image_url: blob.url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "year,classification,weight_class" }
    )

    if (error) {
      console.error("[RecruitNC] nchsaa bracket-upload DB error:", error)
      return NextResponse.json({
        success: true,
        url: blob.url,
        message: `Image uploaded, but database update failed. Create table nchsaa_bracket_images if needed. Error: ${error.message}`,
      })
    }

    return NextResponse.json({ success: true, url: blob.url, year, classification, weight_class: weightClass })
  } catch (e) {
    console.error("[RecruitNC] bracket-upload error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/**
 * GET: return list of weight classes and classifications for the upload form.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    return NextResponse.json({
      weight_classes: WEIGHT_CLASSES,
      classifications: ["1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"],
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
