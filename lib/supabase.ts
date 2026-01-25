import { createBrowserClient } from "@supabase/ssr"
import type { LogoMapping } from "./database-schema"

/**
 * ⚠️ LOCKED CONFIGURATION - DO NOT MODIFY ⚠️
 * 
 * This configuration prevents Supabase rate limiting issues.
 * Changing autoRefreshToken to true will cause users to be locked out.
 * 
 * See AUTH_CONFIG_LOCKED.md for full documentation.
 */
// Create a single instance of the supabase client
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false, // ⚠️ CRITICAL: Must be false to prevent rate limits
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

// Re-export createClient for backwards compatibility
export const createClient = () => supabase

// Named exports for compatibility
export const createClientSupabaseClient = () => supabase
export const createServerSupabaseClient = () => supabase

// Logo mapping functions
export async function getLogoMappings() {
  const { data, error } = await supabase.from("logo_mappings").select("*")

  if (error) {
    console.error("Error fetching logo mappings:", error)
    return []
  }

  return data as LogoMapping[]
}

export async function getLogoMapping(entityName: string, entityType: string) {
  const { data, error } = await supabase
    .from("logo_mappings")
    .select("*")
    .eq("entity_name", entityName)
    .eq("entity_type", entityType)
    .single()

  if (error) {
    // If no mapping found, this is not necessarily an error
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching logo mapping:", error)
    return null
  }

  return data as LogoMapping
}

export async function saveLogoMapping(entityName: string, entityType: string, logoUrl: string) {
  // Check if mapping already exists
  const existing = await getLogoMapping(entityName, entityType)

  if (existing) {
    // Update existing mapping
    const { error } = await supabase
      .from("logo_mappings")
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)

    if (error) {
      console.error("Error updating logo mapping:", error)
      return false
    }

    return true
  } else {
    // Create new mapping
    const { error } = await supabase.from("logo_mappings").insert({
      entity_name: entityName,
      entity_type: entityType,
      logo_url: logoUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error creating logo mapping:", error)
      return false
    }

    return true
  }
}

export async function deleteLogoMapping(entityName: string, entityType: string) {
  const { error } = await supabase
    .from("logo_mappings")
    .delete()
    .eq("entity_name", entityName)
    .eq("entity_type", entityType)

  if (error) {
    console.error("Error deleting logo mapping:", error)
    return false
  }

  return true
}
