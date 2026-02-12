import { createClient } from "@/lib/supabase/server"

// Server-side logo fetching function
export async function getLogoUrlServer(type: string, entityName: string): Promise<string | null> {
  try {
    if (!entityName) {
      return null
    }

    const supabase = createClient()

    // Direct URL mappings for specific cases
    const DIRECT_URL_MAPPINGS: Record<string, string> = {
      "appalachian state": "/appalachian-state-mountains.png",
      "appalachian state university": "/appalachian-state-mountains.png",
      "app state": "/appalachian-state-mountains.png",
      "unc chapel hill": "/UNC_Chapel_Hill_Logo.png",
      "university of north carolina": "/UNC_Chapel_Hill_Logo.png",
      "nc state": "/wolfpack-logo.png",
      "north carolina state": "/wolfpack-logo.png",
      "campbell university": "/campbell-university-seal.png",
      campbell: "/campbell-university-seal.png",
      "queens university": "/queens-university-shield.png",
      queens: "/queens-university-shield.png",
      "belmont abbey": "/belmont-abbey-architectural-detail.png",
      "belmont abbey college": "/belmont-abbey-architectural-detail.png",
      "unc pembroke": "/unc-pembroke-seal.png",
      "university of north carolina at pembroke": "/unc-pembroke-seal.png",
      "greensboro college": "/Greensboro-College-Seal.png",
    }

    const normalizedEntityName = entityName.toLowerCase().trim()
    if (DIRECT_URL_MAPPINGS[normalizedEntityName]) {
      return DIRECT_URL_MAPPINGS[normalizedEntityName]
    }

    // Known high-school logo fallbacks when not in DB
    const HIGH_SCHOOL_LOGO_FALLBACKS: Record<string, string> = {
      "green level":
        "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XcmZnv2MqXA5sMIzKpJQy-Green%20Level.png",
      "green level high school":
        "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XcmZnv2MqXA5sMIzKpJQy-Green%20Level.png",
      "green hope":
        "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/pPaUHAqalF1e9SF-xslhG-Green%20Hope.png",
      "green hope high school":
        "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/pPaUHAqalF1e9SF-xslhG-Green%20Hope.png",
    }
    if (type === "highschool" && HIGH_SCHOOL_LOGO_FALLBACKS[normalizedEntityName]) {
      return HIGH_SCHOOL_LOGO_FALLBACKS[normalizedEntityName]
    }
    const withoutHighSchool = normalizedEntityName.replace(/\s+high\s+school$/i, "").trim()
    if (type === "highschool" && withoutHighSchool && HIGH_SCHOOL_LOGO_FALLBACKS[withoutHighSchool]) {
      return HIGH_SCHOOL_LOGO_FALLBACKS[withoutHighSchool]
    }

    // Try exact match first
    const { data: exactData, error: exactError } = await supabase
      .from("logo_mappings")
      .select("logo_url")
      .eq("entity_type", type)
      .ilike("entity_name", entityName)
      .maybeSingle()

    if (!exactError && exactData) {
      return exactData.logo_url
    }

    // Try partial match
    const { data: partialData, error: partialError } = await supabase
      .from("logo_mappings")
      .select("logo_url, entity_name")
      .eq("entity_type", type)
      .or(`entity_name.ilike.%${normalizedEntityName}%, entity_name.ilike.%${normalizedEntityName.replace(" ", "%")}%`)
      .limit(1)

    if (!partialError && partialData && partialData.length > 0) {
      return partialData[0].logo_url
    }

    return null
  } catch (error) {
    console.error(`❌ Exception in getLogoUrlServer for ${type} ${entityName}:`, error)
    return null
  }
}
