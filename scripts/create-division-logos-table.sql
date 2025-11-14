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
