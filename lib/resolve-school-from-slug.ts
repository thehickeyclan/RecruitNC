"use server"

import { createAdminClient } from "@/lib/supabase/admin"

interface ResolvedSchool {
  id: string
  name?: string | null
}

const STOP_WORDS_REGEX = /\b(college|university|state|community college|institute|school|academy|the)\b/gi

function slugify(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
  return normalized || null
}

export async function resolveSchoolFromSlug(slug: string): Promise<ResolvedSchool | null> {
  if (!slug) return null

  const supabase = createAdminClient()

  const { data, error } = await supabase.from("schools").select("id, name, school_name")
  if (error || !data) {
    console.error("[college slug resolver] Failed to fetch schools list:", error)
    return null
  }

  const slugMap = new Map<string, { id: string; label?: string }>()
  data.forEach((row: any) => {
    const id = row.id as string
    const candidates = [slugify(row.name), slugify(row.school_name)]
    candidates.forEach((candidate) => {
      if (candidate) {
        slugMap.set(candidate, { id, label: row.school_name ?? row.name })
      }
    })
  })

  const normalizedSlug = slugify(slug)
  if (normalizedSlug && slugMap.has(normalizedSlug)) {
    const match = slugMap.get(normalizedSlug)!
    return { id: match.id, name: match.label }
  }

  const expandedCandidates = [
    normalizedSlug,
    slugify(slug.replace(/-/g, " ")),
    slugify(slug.replace(/-/g, "")),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of expandedCandidates) {
    if (slugMap.has(candidate)) {
      const match = slugMap.get(candidate)!
      return { id: match.id, name: match.label }
    }
  }

  return null
}

