import { type NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log("🗑️ Attempting to delete:", url)

    let deletionSuccess = false
    let errorMessage = ""

    // Try to delete from Vercel Blob
    try {
      await del(url)
      console.log("✅ Successfully deleted from blob storage:", url)
      deletionSuccess = true
    } catch (blobError) {
      console.log("⚠️ Blob deletion failed (file may not exist):", blobError)
      errorMessage = `Blob deletion failed: ${blobError}`
      // Continue with database cleanup even if blob deletion fails
    }

    // Try to remove from database (media_items table)
    try {
      const supabase = createClient()

      // Try to delete from media_items table
      const { error: mediaError } = await supabase.from("media_items").delete().eq("url", url)

      if (mediaError) {
        console.log("⚠️ Media items deletion failed:", mediaError)
      } else {
        console.log("✅ Successfully removed from media_items table")
        deletionSuccess = true
      }

      // Also try to delete from logo_mappings if it's a logo
      const { error: logoError } = await supabase.from("logo_mappings").delete().eq("logo_url", url)

      if (logoError) {
        console.log("⚠️ Logo mappings deletion failed:", logoError)
      } else {
        console.log("✅ Successfully removed from logo_mappings table")
        deletionSuccess = true
      }
    } catch (dbError) {
      console.log("⚠️ Database cleanup failed:", dbError)
      errorMessage += ` Database cleanup failed: ${dbError}`
    }

    if (deletionSuccess) {
      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
        warnings: errorMessage ? [errorMessage] : [],
      })
    } else {
      return NextResponse.json(
        {
          error: "Failed to delete file",
          details: errorMessage,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ Delete operation failed:", error)
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
