"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export type LogoMapping = {
  id?: string
  entity_name: string
  logo_url: string
  entity_type: string
  created_at?: string
  updated_at?: string
}

// Function to normalize entity names for matching
function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
}

// Function to get logo URL from database with proper error handling
export async function getLogoUrl(entityType: string, entityName: string): Promise<string | null> {
  if (!entityName) {
    return null
  }

  try {
    const supabase = createClient()

    // First try exact match from database
    const { data: exactData, error: exactError } = await supabase
      .from("logo_mappings")
      .select("logo_url")
      .eq("entity_type", entityType)
      .ilike("entity_name", entityName)
      .maybeSingle()

    if (!exactError && exactData?.logo_url) {
      return exactData.logo_url
    }

    // Try partial match from database
    const { data: partialData, error: partialError } = await supabase
      .from("logo_mappings")
      .select("logo_url, entity_name")
      .eq("entity_type", entityType)
      .or(`entity_name.ilike.%${entityName}%`)
      .limit(1)

    if (!partialError && partialData && partialData.length > 0) {
      return partialData[0].logo_url
    }

    return null
  } catch (error) {
    console.error(`❌ Database error for ${entityType} ${entityName}:`, error)
    return null
  }
}

// Alias for backward compatibility
export async function getMappedLogo(entityType: string, entityName: string): Promise<string | null> {
  return getLogoUrl(entityType, entityName)
}

// Function to save a logo mapping
export async function saveLogoMapping(
  mapping: Omit<LogoMapping, "id" | "created_at" | "updated_at">,
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Check if mapping already exists
    const { data: existingMapping, error: findError } = await supabase
      .from("logo_mappings")
      .select("id")
      .eq("entity_type", mapping.entity_type)
      .ilike("entity_name", mapping.entity_name)
      .maybeSingle()

    if (findError) {
      console.error("Error checking for existing mapping:", findError)
      return false
    }

    let result
    if (existingMapping?.id) {
      // Update existing mapping
      result = await supabase.from("logo_mappings").update({ logo_url: mapping.logo_url }).eq("id", existingMapping.id)
    } else {
      // Insert new mapping
      result = await supabase.from("logo_mappings").insert([mapping])
    }

    const { error } = result
    if (error) {
      console.error("Error saving logo mapping:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Exception in saveLogoMapping:", error)
    return false
  }
}

// Function to get all logo mappings
export async function getLogoMappings(type?: string): Promise<LogoMapping[]> {
  try {
    const supabase = createClient()
    let query = supabase.from("logo_mappings").select("*")

    if (type) {
      query = query.eq("entity_type", type)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching logo mappings:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Exception in getLogoMappings:", error)
    return []
  }
}

// React hook for fetching logo mappings
export function useLogoMappings(type?: string) {
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchLogoMappings() {
      try {
        setIsLoading(true)
        const logoMappingsData = await getLogoMappings(type)

        // Convert array of mappings to a record for easier access
        const mappingsRecord: Record<string, string> = {}
        logoMappingsData.forEach((mapping) => {
          mappingsRecord[mapping.entity_name] = mapping.logo_url
        })

        setMappings(mappingsRecord)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogoMappings()
  }, [type])

  return { mappings, isLoading, error }
}

// Function to update a logo mapping
export async function updateLogoMapping(id: string, mapping: Partial<LogoMapping>): Promise<LogoMapping | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("logo_mappings").update(mapping).eq("id", id).select().single()

    if (error) {
      console.error(`Error updating logo mapping with id ${id}:`, error)
      return null
    }

    return data
  } catch (error) {
    console.error(`Exception in updateLogoMapping for id ${id}:`, error)
    return null
  }
}

// Function to delete a logo mapping
export async function deleteLogoMapping(id: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from("logo_mappings").delete().eq("id", id)

    if (error) {
      console.error(`Error deleting logo mapping with id ${id}:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`Exception in deleteLogoMapping for id ${id}:`, error)
    return false
  }
}
