import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAthletesColumnNames } from "@/lib/athletes-schema"
import { nanoid } from "nanoid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting image upload process")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const athleteId = (formData.get("athleteId") as string) || (formData.get("entityId") as string)
    const category = (formData.get("category") as string) || "profile"

    console.log("[v0] Upload params:", { athleteId, category, fileName: file?.name, fileSize: file?.size })

    if (!file) {
      console.log("[v0] Error: No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!athleteId) {
      console.log("[v0] Error: No athlete ID provided")
      return NextResponse.json({ error: "No athlete ID provided" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const { error: athleteErr } = await adminSupabase
      .from("athletes")
      .select("id")
      .eq("id", athleteId)
      .single()
    if (athleteErr) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const uniqueId = nanoid(8)
    const fileExtension = file.name.split(".").pop() || "jpg"
    const filename = `athletes/${athleteId}/${category}-${uniqueId}.${fileExtension}`

    console.log("[v0] Uploading to Blob with filename:", filename)

    const blob = await put(filename, file, {
      access: "public",
    })

    console.log("[v0] Blob upload successful:", blob.url)

    const columns = await getAthletesColumnNames(adminSupabase)
    const photoColumnCandidates: Record<string, string[]> = {
      profile: ["photourl", "photo_url"],
      headshot: ["headshot_url"],
      commitment: ["commitmentphotourl", "commitment_photo_url"],
    }
    const candidates = photoColumnCandidates[category] || ["photourl"]
    const updateField = candidates.find((c) => columns.has(c)) || candidates[0]

    const { error } = await adminSupabase
      .from("athletes")
      .update({ [updateField]: blob.url })
      .eq("id", athleteId)
      .select()

    if (error) {
      console.error("[v0] Database update error:", error)
      return NextResponse.json(
        { error: "Failed to update athlete record", details: error.message, url: blob.url },
        { status: 500 },
      )
    }
    console.log("[v0] Database update successful")

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      message: `${category} image uploaded and athlete record updated successfully`,
    })
  } catch (error) {
    console.error("[v0] Upload process error:", error)
    return NextResponse.json(
      {
        error: "Failed to process image upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
