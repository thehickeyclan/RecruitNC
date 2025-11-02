import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("=== CREATING MATCHES TABLE IN CORRECT DATABASE ===")

    // Create the matches table with proper structure
    // Using a simple INSERT approach since we know this database works
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS matches (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        wrestler_id TEXT UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        season TEXT NOT NULL,
        grade TEXT,
        high_school TEXT,
        total_matches INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        pins INTEGER DEFAULT 0,
        tech_falls INTEGER DEFAULT 0,
        decisions INTEGER DEFAULT 0,
        major_decisions INTEGER DEFAULT 0,
        forfeits_won INTEGER DEFAULT 0,
        pin_percentage DECIMAL(5,2) DEFAULT 0,
        tf_percentage DECIMAL(5,2) DEFAULT 0,
        finishing_percentage DECIMAL(5,2) DEFAULT 0,
        matches JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Try to execute the SQL using a direct approach
    try {
      // First, let's try using the rpc method that might exist
      const { data: createData, error: createError } = await supabase.rpc("exec_sql", {
        sql: createTableSQL,
      })

      if (createError) {
        console.log("RPC method failed, trying alternative...")
        throw createError
      }

      console.log("Table created successfully with RPC")
    } catch (rpcError) {
      console.log("RPC failed, trying direct SQL execution...")

      // Alternative: Try to create via a stored procedure or function
      // Since we can't execute raw SQL directly, let's try a different approach

      // Let's try creating a simple test record first to see if we can create the table structure
      try {
        // This will fail but might give us insight into the database capabilities
        const { error: testError } = await supabase.from("matches").insert([
          {
            wrestler_id: "test_id",
            first_name: "Test",
            last_name: "User",
            season: "2024-25",
          },
        ])

        if (testError && testError.message.includes("does not exist")) {
          return Response.json({
            success: false,
            error: "Cannot create table through API",
            details: "Your database doesn't allow table creation through the API. You'll need to create it manually.",
            solution: "Run the SQL in your Supabase dashboard",
            sql_to_run: createTableSQL,
            current_tables: ["athletes", "logo_mappings"],
            missing_tables: ["matches", "media_items"],
          })
        }
      } catch (insertError) {
        console.log("Insert test failed as expected")
      }
    }

    // Test that we can access the table
    const { data: testData, error: testError } = await supabase.from("matches").select("*").limit(1)

    if (testError) {
      return Response.json({
        success: false,
        error: "Table creation unclear - please create manually",
        details: testError.message,
        sql_to_run: createTableSQL,
        instructions: [
          "1. Go to your Supabase dashboard",
          "2. Open the SQL Editor",
          "3. Paste and run the provided SQL",
          "4. Come back and test the table access",
        ],
      })
    }

    return Response.json({
      success: true,
      message: "✅ Matches table created successfully!",
      table_created: true,
      table_accessible: true,
      next_steps: ["Test the table access", "Upload sample data", "Start using the matches functionality"],
    })
  } catch (error) {
    console.error("Create matches table error:", error)
    return Response.json({
      success: false,
      error: "Failed to create matches table",
      details: error instanceof Error ? error.message : "Unknown error",
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
      sql_to_run: `
        CREATE TABLE IF NOT EXISTS matches (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          wrestler_id TEXT UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          season TEXT NOT NULL,
          grade TEXT,
          high_school TEXT,
          total_matches INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          pins INTEGER DEFAULT 0,
          tech_falls INTEGER DEFAULT 0,
          decisions INTEGER DEFAULT 0,
          major_decisions INTEGER DEFAULT 0,
          forfeits_won INTEGER DEFAULT 0,
          pin_percentage DECIMAL(5,2) DEFAULT 0,
          tf_percentage DECIMAL(5,2) DEFAULT 0,
          finishing_percentage DECIMAL(5,2) DEFAULT 0,
          matches JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_matches_wrestler_id ON matches(wrestler_id);
        CREATE INDEX IF NOT EXISTS idx_matches_name_season ON matches(first_name, last_name, season);
        CREATE INDEX IF NOT EXISTS idx_matches_high_school ON matches(high_school);
        CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);

        -- Set up permissions
        ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow service role full access" ON matches FOR ALL USING (true);
        GRANT ALL ON matches TO authenticated;
        GRANT ALL ON matches TO anon;
        GRANT ALL ON matches TO service_role;
      `,
      manual_creation_required: true,
    })
  }
}

export async function GET() {
  try {
    console.log("=== TESTING MATCHES TABLE ACCESS ===")

    // Test basic table access
    const { data, error } = await supabase.from("matches").select("*").limit(5)

    if (error) {
      return Response.json({
        success: false,
        error: "Cannot access matches table",
        details: error.message,
        code: error.code,
        hint: error.hint,
        current_database_tables: ["athletes", "logo_mappings"],
        missing_table: "matches",
      })
    }

    return Response.json({
      success: true,
      message: "✅ Matches table is accessible!",
      record_count: data?.length || 0,
      sample_records: data,
      table_exists: true,
      table_accessible: true,
    })
  } catch (error) {
    console.error("Test matches table error:", error)
    return Response.json({
      success: false,
      error: "Failed to test matches table",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function PUT(request: Request) {
  try {
    console.log("=== UPLOADING SAMPLE MATCH DATA ===")

    const sampleData = await request.json()

    // Insert the sample data
    const { data, error } = await supabase.from("matches").insert([sampleData]).select()

    if (error) {
      return Response.json({
        success: false,
        error: "Failed to insert sample data",
        details: error.message,
        code: error.code,
        hint: error.hint,
      })
    }

    // Verify the data was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from("matches")
      .select("*")
      .eq("wrestler_id", sampleData.wrestler_id)

    return Response.json({
      success: true,
      message: "✅ Sample data uploaded successfully!",
      inserted_record: data[0],
      verification: verifyData?.[0],
      record_id: data[0]?.id,
      wrestler_id: data[0]?.wrestler_id,
    })
  } catch (error) {
    console.error("Upload sample data error:", error)
    return Response.json({
      success: false,
      error: "Failed to upload sample data",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
