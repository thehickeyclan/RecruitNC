import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Execute each SQL statement individually using Supabase's from() method
    // First, let's try to create the tables using individual operations

    // Check if media_items table exists
    const { data: existingTables, error: checkError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "media_items")

    if (checkError) {
      console.error("Error checking existing tables:", checkError)
    }

    // Since we can't execute DDL directly through Supabase client,
    // let's use the PostgreSQL connection directly
    const { Pool } = require("pg")

    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })

    const client = await pool.connect()

    try {
      // Execute the SQL script in parts
      await client.query(`
        CREATE TABLE IF NOT EXISTS media_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL,
          entity_type TEXT,
          entity_name TEXT,
          alias TEXT,
          alt_text TEXT,
          caption TEXT,
          tags TEXT[] DEFAULT '{}',
          mime_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          metadata JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS media_usage (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
          used_in_table TEXT NOT NULL,
          used_in_column TEXT NOT NULL,
          used_in_record_id TEXT NOT NULL,
          usage_context TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(media_id, used_in_table, used_in_column, used_in_record_id)
        );
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_media_items_category ON media_items(category);
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_media_items_entity_type ON media_items(entity_type);
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_media_items_active ON media_items(is_active);
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_media_items_tags ON media_items USING GIN(tags);
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_media_usage_media_id ON media_usage(media_id);
      `)

      // Create function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
           NEW.updated_at = NOW();
           RETURN NEW;
        END;
        $$ language 'plpgsql';
      `)

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS update_media_items_updated_at ON media_items;
      `)

      await client.query(`
        CREATE TRIGGER update_media_items_updated_at
           BEFORE UPDATE ON media_items
           FOR EACH ROW
           EXECUTE FUNCTION update_updated_at_column();
      `)
    } finally {
      client.release()
      await pool.end()
    }

    return NextResponse.json({
      success: true,
      message: "Unified media tables created successfully",
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Exception during script execution",
    })
  }
}
