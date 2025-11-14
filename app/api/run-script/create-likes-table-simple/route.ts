import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create likes table with proper relationships
        CREATE TABLE IF NOT EXISTS likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Ensure a user can only like an athlete once
          UNIQUE(user_id, athlete_id)
        );

        -- Add like_count to athletes table for denormalized counting
        ALTER TABLE athletes 
        ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Simple likes table created successfully",
    })
  } catch (error) {
    console.error("Error creating simple likes table:", error)
    return NextResponse.json({ error: "Failed to create simple likes table" }, { status: 500 })
  }
}
