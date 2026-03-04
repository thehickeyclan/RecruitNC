import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

/** Returns current user or null. Use in API routes; return 401 if null. */
export async function getMessagingUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
