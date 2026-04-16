import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Use globalThis to ensure singleton across serverless function invocations
// In Vercel/serverless, each invocation might be a new process, but globalThis persists
const globalForSupabase = globalThis as unknown as {
  adminClient: SupabaseClient | undefined
}

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  // Check both local and global singleton
  if (adminClient) return adminClient
  if (globalForSupabase.adminClient) {
    adminClient = globalForSupabase.adminClient
    return adminClient
  }
  
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  
  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch }, // use platform fetch
  })
  
  // Store in globalThis for persistence across serverless invocations
  globalForSupabase.adminClient = adminClient
  
  return adminClient
}

export const supabaseAdmin = getSupabaseAdmin()

export function getSupabaseProjectInfo() {
  const admin = getSupabaseAdmin()
  return {
    url: process.env.SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    client: admin,
  }
}
