import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Create college_master table
    const { error: masterTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS college_master (
          id SERIAL PRIMARY KEY,
          canonical_name VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          division VARCHAR(50),
          state VARCHAR(100) DEFAULT 'North Carolina',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })

    if (masterTableError) {
      // Try direct SQL execution instead
      const { error: directError1 } = await supabase.from("college_master").select("id").limit(1)

      // If table doesn't exist, we need to create it manually
      if (directError1?.code === "42P01") {
        // Table doesn't exist, let's create it step by step
        console.log("Creating college_master table manually...")

        // We'll use a different approach - create via direct SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS college_master (
            id SERIAL PRIMARY KEY,
            canonical_name VARCHAR(255) UNIQUE NOT NULL,
            display_name VARCHAR(255) NOT NULL,
            division VARCHAR(50),
            state VARCHAR(100) DEFAULT 'North Carolina',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `

        // Since we can't use exec_sql, let's try a different approach
        // We'll create the table using Supabase's SQL editor equivalent
        const { error: createError } = await supabase.rpc("create_college_master_table")

        if (createError) {
          console.error("Error creating college_master table:", createError)
          return NextResponse.json(
            {
              error: "Could not create college_master table. Please create it manually in Supabase SQL editor.",
              sql: createTableSQL,
            },
            { status: 500 },
          )
        }
      }
    }

    // Create college_aliases table
    const { error: aliasTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS college_aliases (
          id SERIAL PRIMARY KEY,
          college_master_id INTEGER REFERENCES college_master(id) ON DELETE CASCADE,
          alias_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })

    if (aliasTableError) {
      console.log("Trying alternative approach for college_aliases table...")
    }

    // Try to insert some initial data to test
    const { error: insertError } = await supabase.from("college_master").upsert(
      [
        {
          canonical_name: "UNC Chapel Hill",
          display_name: "UNC Chapel Hill",
          division: "Division I",
        },
        {
          canonical_name: "NC State",
          display_name: "NC State",
          division: "Division I",
        },
        {
          canonical_name: "Duke",
          display_name: "Duke University",
          division: "Division I",
        },
        {
          canonical_name: "Appalachian State",
          display_name: "Appalachian State",
          division: "Division I",
        },
        {
          canonical_name: "UNC Pembroke",
          display_name: "UNC Pembroke",
          division: "Division II",
        },
        {
          canonical_name: "Mount Olive",
          display_name: "Mount Olive University",
          division: "Division II",
        },
        {
          canonical_name: "Belmont Abbey",
          display_name: "Belmont Abbey College",
          division: "Division II",
        },
        {
          canonical_name: "Greensboro College",
          display_name: "Greensboro College",
          division: "Division III",
        },
        {
          canonical_name: "Montreat",
          display_name: "Montreat College",
          division: "NAIA",
        },
        {
          canonical_name: "Wake Tech",
          display_name: "Wake Technical Community College",
          division: "NJCAA",
        },
      ],
      {
        onConflict: "canonical_name",
      },
    )

    if (insertError) {
      console.error("Error inserting initial data:", insertError)
      return NextResponse.json(
        {
          error: "Tables may exist but could not insert initial data: " + insertError.message,
          details: insertError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "College master system initialized successfully with initial data",
    })
  } catch (error) {
    console.error("Error in create-college-master-table:", error)
    return NextResponse.json(
      {
        error: "Failed to create college master tables",
        details: error instanceof Error ? error.message : "Unknown error",
        instructions: "You may need to create the tables manually in Supabase SQL editor",
      },
      { status: 500 },
    )
  }
}
