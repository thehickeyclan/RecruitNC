import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Check if the athletes table exists and create if needed
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'athletes'
            ) THEN
                -- Create athletes table with comprehensive structure
                CREATE TABLE public.athletes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    graduationyear INTEGER,
                    weightclass TEXT,
                    highschool TEXT,
                    college TEXT,
                    wrestlingclub TEXT,
                    division TEXT,
                    gender TEXT,
                    commitmentdate DATE,
                    image_url TEXT,
                    achievements TEXT[],
                    team_affiliation TEXT,
                    like_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
                
                -- Add indexes for better performance
                CREATE INDEX idx_athletes_graduationyear ON public.athletes(graduationyear);
                CREATE INDEX idx_athletes_division ON public.athletes(division);
                CREATE INDEX idx_athletes_gender ON public.athletes(gender);
                CREATE INDEX idx_athletes_college ON public.athletes(college);
                CREATE INDEX idx_athletes_highschool ON public.athletes(highschool);
                
                RAISE NOTICE 'Created athletes table with comprehensive structure';
            ELSE
                RAISE NOTICE 'Athletes table already exists';
            END IF;
        END
        $$;
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Athletes table created successfully with comprehensive structure",
    })
  } catch (error) {
    console.error("Error creating athletes table:", error)
    return NextResponse.json({ error: "Failed to create athletes table" }, { status: 500 })
  }
}
