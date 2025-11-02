import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const sql = neon(process.env.POSTGRES_URL!)

    // Idempotent policy setup for athlete_confirmations
    const statements = `
      -- Ensure RLS is enabled
      alter table if exists public.athlete_confirmations enable row level security;

      -- Grant basic privileges to authenticated role
      do $$
      begin
        if not exists (
          select 1 from information_schema.role_table_grants
          where grantee = 'authenticated' and table_schema = 'public' and table_name = 'athlete_confirmations'
        ) then
          grant select, insert, update on table public.athlete_confirmations to authenticated;
        end if;
      end
      $$;

      -- INSERT policy: allow authenticated users to insert when they are the confirmer
      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'athlete_confirmations'
            and policyname = 'insert_own_confirmation'
        ) then
          create policy "insert_own_confirmation"
          on public.athlete_confirmations
          for insert
          to authenticated
          with check (confirmed_by = auth.uid());
        end if;
      end
      $$;

      -- UPDATE policy: allow authenticated users to update their own confirmation row
      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'athlete_confirmations'
            and policyname = 'update_own_confirmation'
        ) then
          create policy "update_own_confirmation"
          on public.athlete_confirmations
          for update
          to authenticated
          using (confirmed_by = auth.uid())
          with check (confirmed_by = auth.uid());
        end if;
      end
      $$;

      -- SELECT policy: allow authenticated users to read confirmations (adjust if needed)
      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'athlete_confirmations'
            and policyname = 'select_authenticated'
        ) then
          create policy "select_authenticated"
          on public.athlete_confirmations
          for select
          to authenticated
          using (true);
        end if;
      end
      $$;
    `

    // Important: use Neon helpers for raw multi-statement SQL
    await sql.unsafe(statements)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("ensure-athlete-confirmations-policies error:", err)
    return NextResponse.json(
      { error: "Failed to apply policies", details: err?.message ?? null },
      { status: 500 },
    )
  }
}
