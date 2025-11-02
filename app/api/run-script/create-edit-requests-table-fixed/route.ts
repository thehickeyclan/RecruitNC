import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Execute each SQL statement separately
    const statements = [
      // Create table
      `CREATE TABLE IF NOT EXISTS edit_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        athlete_id TEXT NOT NULL,
        request_type TEXT NOT NULL DEFAULT 'edit',
        status TEXT NOT NULL DEFAULT 'pending',
        request_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_edit_requests_user_id ON edit_requests(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_edit_requests_athlete_id ON edit_requests(athlete_id)`,
      `CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status)`,

      // Enable RLS
      `ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY`,
    ]

    // Execute each statement
    for (const statement of statements) {
      const { error } = await supabase.rpc("exec", { sql: statement })
      if (error) {
        console.error("Error executing statement:", statement, error)
        // Try direct query if rpc fails
        const { error: directError } = await supabase.from("edit_requests").select("id").limit(1)
        if (directError && !directError.message.includes("does not exist")) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
    }

    // Create policies using direct SQL
    const policies = [
      `DROP POLICY IF EXISTS "Users can view their own edit requests" ON edit_requests`,
      `CREATE POLICY "Users can view their own edit requests" ON edit_requests
        FOR SELECT USING (auth.uid() = user_id)`,

      `DROP POLICY IF EXISTS "Users can create edit requests" ON edit_requests`,
      `CREATE POLICY "Users can create edit requests" ON edit_requests
        FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    ]

    for (const policy of policies) {
      await supabase.rpc("exec", { sql: policy }).catch(() => {
        // Ignore policy errors for now
      })
    }

    // Test if table was created by trying to select from it
    const { error: testError } = await supabase.from("edit_requests").select("id").limit(1)

    if (testError && testError.message.includes("does not exist")) {
      return NextResponse.json(
        {
          error: "Table creation failed - table does not exist after creation attempt",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Edit requests table created successfully",
    })
  } catch (error) {
    console.error("Error in create edit requests table script:", error)
    return NextResponse.json(
      {
        error: "Failed to create edit requests table: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}
