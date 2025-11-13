"use server"

import { createClient } from "@/lib/supabase/server"

interface ResolvedSchool {
  id: string
  name?: string | null
}

const STOP_WORDS_REGEX = /\b(college|university|state|community college|institute|school|academy|the)\b/gi

export async function resolveSchoolFromSlug(slug: string): Promise<ResolvedSchool | null> {
  if (!slug) return null

  const supabase = await createClient()

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

  for (const candidate of candidatePhrases) {
    if (!candidate) continue

    const { data, error } = await supabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${candidate}%`)
      .limit(1)

    if (error) {
      console.error(`[college slug resolver] Supabase error for candidate "${candidate}" from slug "${slug}":`, error)
      continue
    }

    if (data && data.length > 0) {
      return { id: data[0].id as string, name: (data[0] as any)?.name }
    }
  }

  return null
}

