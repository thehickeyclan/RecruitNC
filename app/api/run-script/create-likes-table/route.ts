import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create likes table with proper relationships
        CREATE TABLE IF NOT EXISTS public.likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Ensure a user can only like an athlete once
          UNIQUE(user_id, athlete_id)
        );

        -- Add RLS policies for security
        ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

        -- Anyone can read likes
        CREATE POLICY "Likes are viewable by everyone" 
        ON public.likes FOR SELECT 
        USING (true);

        -- Users can only insert their own likes
        CREATE POLICY "Users can insert their own likes" 
        ON public.likes FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

        -- Users can only delete their own likes
        CREATE POLICY "Users can delete their own likes" 
        ON public.likes FOR DELETE 
        USING (auth.uid() = user_id);

        -- Add like_count to athletes table for denormalized counting
        ALTER TABLE public.athletes 
        ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Likes table created successfully",
    })
  } catch (error) {
    console.error("Error creating likes table:", error)
    return NextResponse.json({ error: "Failed to create likes table" }, { status: 500 })
  }
}
