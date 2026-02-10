import { createAdminClient } from "@/lib/supabase/admin"

const BASE =
  "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo"

/** Keys and default URLs for every Blue page image. Upload in Admin → Blue to try different pics. */
export const BLUE_IMAGE_KEYS = {
  blue_banner_url: `${BASE}/X65GjDIcBrIc9dG2D6d-1-Blue%20Page%20Banner.png`,
  blue_national_team_kids: `${BASE}/mtS_xnViZ3kKW1u7xHnxQ-National%20Team%20kids%20pic.png`,
  blue_what_makes_1: `${BASE}/0CbXEvNaC6TEMIUDdaX7x-Blue%20Pic%201.png`,
  blue_what_makes_2: `${BASE}/en2sHJA9p9VQNhORVHmHb-Blue%20Pic%206.png`,
  blue_training_env: `${BASE}/e9FE8F2VrBgwI5zMEzS0D-Blue%20pic%204.png`,
  blue_pipeline: `${BASE}/O7pdQfe_87-lRsmAyht2z-Blue%20Pic%207%20.png`,
  blue_coach_colton_palmer: `${BASE}/O7pdQfe_87-lRsmAyht2z-Blue%20Pic%207%20.png`,
  blue_coach_mike_macchiavello: `${BASE}/O7pdQfe_87-lRsmAyht2z-Blue%20Pic%207%20.png`,
  blue_coach_araad_fischer: `${BASE}/O7pdQfe_87-lRsmAyht2z-Blue%20Pic%207%20.png`,
  blue_team_photo: `${BASE}/eNZzhlbUPjwSpRAahxEPt-Blue%20Team%20Photo.png`,
} as const

export type BlueImageKey = keyof typeof BLUE_IMAGE_KEYS

export interface BlueContent {
  blue_banner_url: string
  blue_national_team_kids: string
  blue_what_makes_1: string
  blue_what_makes_2: string
  blue_training_env: string
  blue_pipeline: string
  blue_coach_colton_palmer: string
  blue_coach_mike_macchiavello: string
  blue_coach_araad_fischer: string
  blue_team_photo: string
}

function isValidUrl(s: string): boolean {
  return typeof s === "string" && s.trim().startsWith("http")
}

/**
 * Server-only: get all Blue page image URLs from storage, with defaults.
 */
export async function getBlueContent(): Promise<BlueContent> {
  const defaults = { ...BLUE_IMAGE_KEYS }
  try {
    const admin = createAdminClient()
    const { data: rows } = await admin
      .from("page_content")
      .select("key, value")
      .in("key", Object.keys(BLUE_IMAGE_KEYS))
    const map = new Map<string, string>()
    rows?.forEach((r: { key: string; value: string }) => {
      if (r.value && isValidUrl(r.value)) map.set(r.key, r.value.trim())
    })
    const out = { ...defaults }
    for (const key of Object.keys(defaults) as BlueImageKey[]) {
      const stored = map.get(key)
      if (stored) out[key] = stored
    }
    return out
  } catch {
    return defaults
  }
}

/** @deprecated Use getBlueContent().blue_banner_url */
export async function getBlueBannerUrl(): Promise<string> {
  const c = await getBlueContent()
  return c.blue_banner_url
}
