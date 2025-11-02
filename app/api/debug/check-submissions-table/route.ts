import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // First, try to directly query the table to see if it exists
    const { data: directCheck, error: directError } = await supabase.from("commitment_submissions").select("*").limit(1)

    if (directError) {
      // If table doesn't exist, try to create it
      if (directError.code === "42P01") {
        console.log("Table doesn't exist, attempting to create...")

        const { error: createError } = await supabase.rpc("exec_sql", {
          sql: `
            CREATE TABLE IF NOT EXISTS commitment_submissions (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              first_name TEXT NOT NULL,
              last_name TEXT NOT NULL,
              graduation_year INTEGER NOT NULL,
              gender TEXT NOT NULL,
              weight_class TEXT,
              high_school TEXT NOT NULL,
              club TEXT,
              college TEXT NOT NULL,
              achievements TEXT,
              notes TEXT,
              athlete_image_url TEXT,
              entities JSONB,
              submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              status TEXT DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `,
        })

        if (createError) {
          return NextResponse.json({
            tableExists: false,
            error: "Failed to create table",
            details: createError,
          })
        }

        return NextResponse.json({
          tableExists: false,
          created: true,
          message: "Table was created successfully",
        })
      }

      return NextResponse.json({
        tableExists: false,
        error: "Error accessing table",
        details: directError,
      })
    }

    // If we get here, table exists - let's count rows
    const { count, error: countError } = await supabase
      .from("commitment_submissions")
      .select("*", { count: "exact", head: true })

    // Get all submissions
    const { data: allData, error: allDataError } = await supabase
      .from("commitment_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })

    return NextResponse.json({
      tableExists: true,
      rowCount: count,
      countError: countError,
      allSubmissions: allData,
      dataError: allDataError,
    })
  } catch (error) {
    console.error("Error in check-submissions-table:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
