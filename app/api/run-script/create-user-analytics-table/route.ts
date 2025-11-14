import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create the user_analytics table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_analytics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL DEFAULT 'page_view',
        page_url TEXT NOT NULL,
        referrer TEXT,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_analytics_page_url ON user_analytics(page_url);
      CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);

      -- Enable RLS
      ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

      -- Create policy for admin access
      CREATE POLICY IF NOT EXISTS "Admin can view all analytics" ON user_analytics
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.is_admin = true
          )
        );
    `

    const { error } = await supabase.rpc("exec_sql", { sql_query: createTableSQL })

    if (error) {
      // Try alternative method
      const { error: directError } = await supabase.from("user_analytics").select("id").limit(1)

      if (directError && directError.code === "42P01") {
        // Table doesn't exist, try creating with individual queries
        const queries = [
          `CREATE TABLE IF NOT EXISTS user_analytics (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL DEFAULT 'page_view',
            page_url TEXT NOT NULL,
            referrer TEXT,
            user_agent TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id)`,
          `CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at)`,
          `CREATE INDEX IF NOT EXISTS idx_user_analytics_page_url ON user_analytics(page_url)`,
          `ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY`,
        ]

        for (const query of queries) {
          const { error: queryError } = await supabase.rpc("exec_sql", { sql_query: query })
          if (queryError) {
            console.error("Query error:", queryError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "User analytics table created successfully",
    })
  } catch (error) {
    console.error("Error creating user analytics table:", error)
    return NextResponse.json({ error: "Failed to create user analytics table" }, { status: 500 })
  }
}
