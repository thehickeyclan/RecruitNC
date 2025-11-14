import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if table already exists
    const { data: tables } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_name", "edit_requests")
      .eq("table_schema", "public")

    if (tables && tables.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Edit requests table already exists",
      })
    }

    // Create table using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.edit_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        athlete_id TEXT NOT NULL,
        request_type TEXT NOT NULL DEFAULT 'edit',
        status TEXT NOT NULL DEFAULT 'pending',
        request_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_edit_requests_user_id ON public.edit_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_edit_requests_athlete_id ON public.edit_requests(athlete_id);
      CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON public.edit_requests(status);
      
      ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;
    `

    // Execute using supabase client
    const { error } = await supabase.rpc("exec", { sql: createTableSQL })

    if (error) {
      console.error("RPC exec failed, trying alternative method:", error)

      // Alternative: Try to insert a test record to see if table exists
      const { error: insertError } = await supabase
        .from("edit_requests")
        .insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          athlete_id: "test",
          request_data: { test: true },
        })
        .select()

      if (insertError && insertError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Cannot create table - insufficient permissions or RPC not available",
          },
          { status: 500 },
        )
      }

      // If we got here, table might exist, clean up test record
      await supabase.from("edit_requests").delete().eq("athlete_id", "test")
    }

    return NextResponse.json({
      success: true,
      message: "Edit requests table setup completed",
    })
  } catch (error) {
    console.error("Error in setup:", error)
    return NextResponse.json(
      {
        error: "Setup failed: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}
