import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Check the structure of the likes table
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'likes';
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Likes table structure checked successfully",
      data,
    })
  } catch (error) {
    console.error("Error checking likes table:", error)
    return NextResponse.json({ error: "Failed to check likes table" }, { status: 500 })
  }
}
