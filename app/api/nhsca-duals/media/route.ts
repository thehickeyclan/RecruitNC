import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - List media (approved only for non-admins, all for admins)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
    
    const isAdmin = profile?.role === "admin"
    const { searchParams } = new URL(req.url)
    const team = searchParams.get("team") || "all"
    const status = searchParams.get("status") || "approved"
    const pendingOnly = searchParams.get("pending") === "true"

    let query = supabase
      .from("nhsca_duals_media")
      .select("*")
      .eq("event_year", 2026)
      .order("created_at", { ascending: false })

    if (team !== "all") {
      query = query.or(`team.eq.${team},team.eq.all`)
    }

    // Admins can see pending/rejected, users only see approved + their own
    if (isAdmin && pendingOnly) {
      query = query.eq("status", "pending")
    } else if (isAdmin && status) {
      query = query.eq("status", status)
    } else if (!isAdmin) {
      // Non-admins see approved OR their own uploads
      query = query.or(`status.eq.approved,uploaded_by.eq.${user.id}`)
    }

    const { data: media, error } = await query.limit(100)

    if (error) {
      console.error("Error fetching media:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get pending count for admins
    let pendingCount = 0
    if (isAdmin) {
      const { count } = await supabase
        .from("nhsca_duals_media")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingCount = count || 0
    }

    return NextResponse.json({ media, pendingCount, isAdmin })
  } catch (error) {
    console.error("Media GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Upload media
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, full_name")
      .eq("user_id", user.id)
      .single()
    
    const isAdmin = profile?.role === "admin"
    const formData = await req.formData()
    const file = formData.get("file") as File
    const team = (formData.get("team") as string) || "all"
    const caption = formData.get("caption") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filePath = `2026/${team}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("nhsca-media")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from("nhsca-media")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365)

    const fileUrl = urlData?.signedUrl || ""
    const fileType = file.type.startsWith("video/") ? "video" : "image"

    // Insert media record
    const { data: media, error: insertError } = await supabase
      .from("nhsca_duals_media")
      .insert({
        team,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        mime_type: file.type,
        file_size_bytes: file.size,
        caption,
        status: isAdmin ? "approved" : "pending", // Admin uploads auto-approved
        uploaded_by: user.id,
        uploader_name: profile?.full_name || user.email,
        uploader_role: isAdmin ? "admin" : "parent"
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      media, 
      message: isAdmin ? "Media uploaded and published" : "Media submitted for review" 
    })
  } catch (error) {
    console.error("Media POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Approve/reject media (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
    
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { id, status } = await req.json()

    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { data: media, error } = await supabase
      .from("nhsca_duals_media")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error("Media PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete media (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
    
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 })
    }

    // Get file path first to delete from storage
    const { data: media } = await supabase
      .from("nhsca_duals_media")
      .select("file_name, team")
      .eq("id", id)
      .single()

    if (media) {
      // Delete from storage
      await supabase.storage
        .from("nhsca-media")
        .remove([`2026/${media.team}/${media.file_name}`])
    }

    // Delete record
    const { error } = await supabase
      .from("nhsca_duals_media")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Media DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
