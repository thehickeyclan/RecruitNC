"use server"

import { createAdminClient } from "@/lib/supabase/admin"

interface ResolvedSchool {
  id: string
  name?: string | null
}

const STOP_WORDS_REGEX = /\b(college|university|state|community college|institute|school|academy|the)\b/gi

const HARDCODED_SLUG_MAP: Record<string, { id: string; label?: string }> = {
  "lynchburg-college": { id: "56e27c86-7b74-441b-a18a-c2606abe7356", label: "Lynchburg College" },
  "university-of-lynchburg": { id: "56e27c86-7b74-441b-a18a-c2606abe7356", label: "Lynchburg College" },
  "marymount": { id: "e4c7b37e-4f3f-47a0-9b7c-ea3a3e820007", label: "Marymount University" },
  "marymount-university": { id: "e4c7b37e-4f3f-47a0-9b7c-ea3a3e820007", label: "Marymount University" },
  ferrum: { id: "f1b3e0e1-6c3d-4a20-bcda-412ace284002", label: "Ferrum University" },
  "ferrum-college": { id: "f1b3e0e1-6c3d-4a20-bcda-412ace284002", label: "Ferrum University" },
  "ferrum-university": { id: "f1b3e0e1-6c3d-4a20-bcda-412ace284002", label: "Ferrum University" },
  "emory-and-henry": { id: "107a4ce9-7e38-416f-886b-2589b4479f77", label: "Emory & Henry College" },
  "emory-and-henry-college": { id: "107a4ce9-7e38-416f-886b-2589b4479f77", label: "Emory & Henry College" },
  "emory-henry": { id: "107a4ce9-7e38-416f-886b-2589b4479f77", label: "Emory & Henry College" },
}

export async function resolveSchoolFromSlug(slug: string): Promise<ResolvedSchool | null> {
  if (!slug) return null

  console.log(`[college slug resolver] Incoming slug="${slug}"`)

  const hardcoded = HARDCODED_SLUG_MAP[slug.toLowerCase()]
  if (hardcoded) {
    console.log(
      `[college slug resolver] Using hardcoded mapping for slug="${slug}" -> id="${hardcoded.id}" label="${hardcoded.label}"`,
    )
    return { id: hardcoded.id, name: hardcoded.label }
  }

  const supabase = createAdminClient()

  const normalized = decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const parts = normalized.split(" ").filter(Boolean)

  const candidatePhrases = new Set<string>()
  candidatePhrases.add(normalized)

  const stripped = normalized.replace(STOP_WORDS_REGEX, "").replace(/\s+/g, " ").trim()
  if (stripped) candidatePhrases.add(stripped)

  if (parts.length >= 2) {
    candidatePhrases.add(parts.slice(0, 2).join(" "))
  }
  if (parts.length >= 1) {
    candidatePhrases.add(parts[0])
  }

  const candidatesArray = Array.from(candidatePhrases)
  console.log(`[college slug resolver] Candidates for slug="${slug}":`, candidatesArray)

  for (const candidate of candidatePhrases) {
    if (!candidate) continue

    const { data, error } = await supabase
      .from("schools")
      .select("id, name, school_name")
      .or(
        [
          `name.ilike.%${candidate.replace(/%/g, "\\%")}%`,
          `school_name.ilike.%${candidate.replace(/%/g, "\\%")}%`,
        ].join(","),
      )
      .limit(1)

    if (error) {
      console.error(`[college slug resolver] Supabase error for candidate "${candidate}" from slug "${slug}":`, error)
      continue
    }

    if (data && data.length > 0) {
      const record = data[0] as any
      console.log(
        `[college slug resolver] Match found for slug="${slug}" candidate="${candidate}":`,
        record?.id,
        record?.name,
        record?.school_name,
      )
      return { id: record.id as string, name: record.school_name ?? record.name }
    }
    console.log(`[college slug resolver] No match for slug="${slug}" candidate="${candidate}"`)
  }

  console.warn(`[college slug resolver] No school resolved for slug="${slug}". Candidates attempted:`, candidatesArray)

  return null
}

