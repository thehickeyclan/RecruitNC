/**
 * Single source of truth for logo_mappings entity_type and entity_name.
 * Use these when saving (POST/PATCH/upload) and when looking up (by-entity API, getLogoUrlServer).
 * Ensures names from profile/roster always match what’s saved in enhanced logo manager.
 * Existing rows with different spacing/casing: re-save in enhanced logo manager to canonicalize.
 */

/** Canonical entity types in DB: highschool | college | club */
export function normalizeEntityType(type: string): string {
  const t = type.toLowerCase().trim()
  if (t === "high_school" || t === "high-school" || t === "highschool") return "highschool"
  if (t === "colleges" || t === "college") return "college"
  if (t === "clubs" || t === "club") return "club"
  return t || type
}

/** Trim and collapse multiple spaces so "Green  Level" and " Green Level " both become "Green Level". */
export function normalizeEntityName(name: string): string {
  if (name == null || typeof name !== "string") return ""
  return name.replace(/\s+/g, " ").trim()
}
