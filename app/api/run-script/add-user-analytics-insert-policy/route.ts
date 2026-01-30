import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Adds an RLS policy so anyone (authenticated or anonymous) can INSERT into user_analytics.
 * Without this, only admins can do anything on the table, so profile-view and card-click
 * tracking from non-admin users never gets saved.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const addPolicySQL = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'user_analytics'
            AND policyname = 'allow_analytics_insert'
        ) THEN
          CREATE POLICY "allow_analytics_insert"
          ON public.user_analytics
          FOR INSERT
          WITH CHECK (true);
        END IF;
      END $$;
    `

    const { error } = await supabase.rpc("exec_sql", { sql_query: addPolicySQL })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not add policy via RPC",
          details: error.message,
          manual_sql: `
-- Run this in Supabase SQL Editor if the script fails:
CREATE POLICY "allow_analytics_insert"
ON public.user_analytics
FOR INSERT
WITH CHECK (true);
          `.trim(),
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "user_analytics INSERT policy added; profile view tracking can now record events.",
    })
  } catch (err: unknown) {
    console.error("add-user-analytics-insert-policy error:", err)
    return NextResponse.json(
      {
        error: "Failed to add policy",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
}
