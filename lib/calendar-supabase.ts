import { getSupabaseAdmin } from "@/lib/server-supabase"

/**
 * Get Supabase client for calendar events
 * 
 * MIGRATED: Now uses the main LegacyNC database instead of separate calendar database
 * All calendar events are now stored in the main database's 'events' table
 * 
 * This simplifies the architecture and consolidates Data Dawg access to one database.
 */
export function getCalendarSupabase() {
  return getSupabaseAdmin()
}

