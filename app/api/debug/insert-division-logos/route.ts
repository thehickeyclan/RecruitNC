import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Blob {
  url: string
  pathname: string
}

export async function POST(request: Request) {
  try {
    const { blobs } = (await request.json()) as { blobs: Blob[] }

    if (!blobs || !Array.isArray(blobs) || blobs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No blobs provided",
        },
        { status: 400 },
      )
    }

    const supabase = createClient()
    let insertedCount = 0

    for (const blob of blobs) {
      // Extract the division name from the pathname
      const filename = blob.pathname.split("/").pop() || ""
      const divisionName = filename.replace(/\.[^/.]+$/, "") // Remove file extension

      // Map filename to our standard division names
      let standardName = divisionName

      // If the filename contains NCAA-Division-I.png, extract NCAA-Division-I
      if (divisionName.includes("NCAA-Division-I")) {
        standardName = "NCAA-Division-I"
      } else if (divisionName.includes("NCAA-Division-II")) {
        standardName = "NCAA-Division-II"
      } else if (divisionName.includes("NCAA-Division-III")) {
        standardName = "NCAA-Division-III"
      } else if (divisionName.toLowerCase().includes("naia")) {
        standardName = "NAIA"
      } else if (divisionName.toLowerCase().includes("juco")) {
        standardName = "JUCO"
      }

      // Insert or update the logo mapping
      const { error } = await supabase.from("division_logos").upsert(
        {
          name: standardName,
          url: blob.url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name" },
      )

      if (error) {
        console.error(`Error inserting ${standardName}:`, error)
      } else {
        insertedCount++
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      message: `Inserted ${insertedCount} logos into the database`,
    })
  } catch (error) {
    console.error("Error inserting logos:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}
