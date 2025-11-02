import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Function to create the division_logos table
        CREATE OR REPLACE FUNCTION create_stored_procedure_for_division_logos()
        RETURNS void AS $$
        BEGIN
            -- Create the function to create the division_logos table
            CREATE OR REPLACE FUNCTION create_division_logos_table()
            RETURNS void AS $func$
            BEGIN
                -- Check if the table exists
                IF NOT EXISTS (
                    SELECT FROM pg_tables
                    WHERE schemaname = 'public'
                    AND tablename = 'division_logos'
                ) THEN
                    -- Create the table
                    CREATE TABLE public.division_logos (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        name TEXT UNIQUE NOT NULL,
                        url TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    
                    -- Add RLS policies
                    ALTER TABLE public.division_logos ENABLE ROW LEVEL SECURITY;
                    
                    -- Create policies
                    CREATE POLICY "Allow select for all users" 
                        ON public.division_logos FOR SELECT 
                        USING (true);
                        
                    CREATE POLICY "Allow insert for authenticated users" 
                        ON public.division_logos FOR INSERT 
                        TO authenticated 
                        WITH CHECK (true);
                        
                    CREATE POLICY "Allow update for authenticated users" 
                        ON public.division_logos FOR UPDATE 
                        TO authenticated 
                        USING (true);
                END IF;
            END;
            $func$ LANGUAGE plpgsql;
        END;
        $$ LANGUAGE plpgsql;

        -- Execute the function
        SELECT create_stored_procedure_for_division_logos();
        SELECT create_division_logos_table();
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Division logos table created successfully",
    })
  } catch (error) {
    console.error("Error creating division logos table:", error)
    return NextResponse.json({ error: "Failed to create division logos table" }, { status: 500 })
  }
}
