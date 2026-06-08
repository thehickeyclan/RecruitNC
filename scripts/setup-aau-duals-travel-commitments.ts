/**
 * Create aau_duals_roster_travel_commitments table (verbal travel dropdown storage).
 *
 * Usage: npx tsx scripts/setup-aau-duals-travel-commitments.ts
 *
 * Requires POSTGRES_URL or POSTGRES_URL_NON_POOLING in .env.local
 */

import { existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
import pg from "pg"

const root = resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = join(root, rel)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const SQL = `
create table if not exists public.aau_duals_roster_travel_commitments (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  weight_label text not null,
  travel_need text not null default 'none'
    check (travel_need in ('none', 'flight', 'hotel', 'flight_hotel')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  unique (event_slug, weight_label)
);

create index if not exists idx_aau_duals_travel_commitments_event
  on public.aau_duals_roster_travel_commitments (event_slug);

alter table public.aau_duals_roster_travel_commitments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aau_duals_roster_travel_commitments'
      and policyname = 'Service role full access aau travel commitments'
  ) then
    create policy "Service role full access aau travel commitments"
      on public.aau_duals_roster_travel_commitments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
`

async function main() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL in .env.local")
  }

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(SQL)
    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'aau_duals_roster_travel_commitments'",
    )
    console.log("✓ aau_duals_roster_travel_commitments ready (exists:", rows[0]?.n === 1, ")")
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error("[RecruitNC] setup-aau-duals-travel-commitments:", e)
  process.exit(1)
})
