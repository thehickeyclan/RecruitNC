import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if edit_requests table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase.rpc("exec_sql", {
      sql_query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'edit_requests' 
        ORDER BY ordinal_position;
      `,
    })

    if (tableError) {
      return NextResponse.json({ error: "Failed to check table structure", details: tableError }, { status: 500 })
    }

    // Check foreign key constraints
    const { data: constraints, error: constraintError } = await supabase.rpc("exec_sql", {
      sql_query: `
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'edit_requests';
      `,
    })

    if (constraintError) {
      return NextResponse.json({ error: "Failed to check constraints", details: constraintError }, { status: 500 })
    }

    // Check indexes
    const { data: indexes, error: indexError } = await supabase.rpc("exec_sql", {
      sql_query: `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'edit_requests';
      `,
    })

    if (indexError) {
      return NextResponse.json({ error: "Failed to check indexes", details: indexError }, { status: 500 })
    }

    // Check RLS policies
    const { data: policies, error: policyError } = await supabase.rpc("exec_sql", {
      sql_query: `
        SELECT 
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'edit_requests';
      `,
    })

    if (policyError) {
      return NextResponse.json({ error: "Failed to check RLS policies", details: policyError }, { status: 500 })
    }

    // Test basic query
    const { data: sampleData, error: queryError } = await supabase.from("edit_requests").select("*").limit(1)

    return NextResponse.json({
      success: true,
      tableExists: tableInfo && tableInfo.length > 0,
      columns: tableInfo || [],
      foreignKeys: constraints || [],
      indexes: indexes || [],
      policies: policies || [],
      canQuery: !queryError,
      queryError: queryError?.message || null,
      sampleData: sampleData || [],
    })
  } catch (error) {
    console.error("Error checking edit_requests table:", error)
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}
