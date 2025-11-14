import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    console.log("🔧 Adding profile verification columns...")

    const { error } = await supabase.rpc("exec", {
      sql: `
        -- Add profile verification columns to athletes table
        ALTER TABLE athletes 
        ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS profile_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_athletes_claimed_by_user_id ON athletes(claimed_by_user_id);
        CREATE INDEX IF NOT EXISTS idx_athletes_profile_verified ON athletes(profile_verified);

        -- Update existing claimed profiles to have claimed_at timestamp
        UPDATE athletes 
        SET claimed_at = NOW() 
        WHERE claimed_by_user_id IS NOT NULL AND claimed_at IS NULL;
      `,
    })

    if (error) {
      console.error("❌ Error adding columns:", error)
      return NextResponse.json(
        {
          error: "Failed to add profile verification columns",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Profile verification columns added successfully!")

    return NextResponse.json({
      success: true,
      message: "Profile verification columns added successfully",
    })
  } catch (error) {
    console.error("❌ Exception:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        exception: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
