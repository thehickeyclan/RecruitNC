/**
 * Server-side data loading for the home page.
 *
 * The home page used to client-fetch six endpoints on mount, which meant a blank shell,
 * "Loading..." text, and layout shift on every visit. These loaders run on the server so
 * the page ships rendered.
 *
 * All of them use the service-role admin client and read no cookies, so the page that calls
 * them can still set `revalidate`. Every loader degrades to an empty result instead of
 * throwing — a dead section beats a 500 on the front door.
 */

import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { getCollegesByIds } from "@/lib/colleges"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"

export type HomeStats = {
  total: number
  male: number
  female: number
}

export type HomeRankedProspect = {
  id: string
  name: string
  highschool: string
  graduationyear: number
  photourl: string
  weightclass: string
  prospect_ranking: number | null
}

export type HomeStoreProduct = {
  id: number
  name: string
  description?: string
  price: number
  image_url?: string | null
  slug: string
  category?: string
  featured?: boolean
  in_stock?: boolean
}

const EMPTY_STATS: HomeStats = { total: 0, male: 0, female: 0 }

function norm(text: unknown): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Mirrors /api/stats — athletes carry m/f/male/female/boy/girl inconsistently. */
function normalizeGender(raw: unknown): "male" | "female" | "other" {
  const v = norm(raw)
  if (v === "m" || v === "male" || v === "man" || v === "boy") return "male"
  if (v === "f" || v === "female" || v === "woman" || v === "girl") return "female"
  return "other"
}

/**
 * Commitment counts per graduating class, in one query.
 *
 * The stats bar used to show a profile count split by gender, which answers "how big is
 * your database" — a question no parent or coach is asking. Commits per class answers
 * "how deep is North Carolina right now", and shows a class filling up as its season runs.
 */
export async function loadCommitCountsByClass(years: readonly number[]): Promise<Record<number, number>> {
  const counts: Record<number, number> = Object.fromEntries(years.map((y) => [y, 0]))
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("athletes")
      .select("graduationyear")
      .not("college", "is", null)
      .neq("college", "")
      .neq("is_prospect", true)
      .in("graduationyear", [...years])

    if (error || !Array.isArray(data)) return counts

    for (const row of data) {
      const year = Number((row as { graduationyear?: unknown }).graduationyear)
      if (counts[year] != null) counts[year] += 1
    }
    return counts
  } catch (e) {
    console.error("[home-data] loadCommitCountsByClass failed:", e instanceof Error ? e.message : e)
    return counts
  }
}

/**
 * Commit counts split by gender. Committed athletes only (has a college, not a prospect),
 * matching /api/stats so callers can't disagree with the rest of the site.
 */
export async function loadHomeStats(gradYear?: number | null): Promise<HomeStats> {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("athletes")
      .select("gender")
      .not("college", "is", null)
      .neq("college", "")
      .neq("is_prospect", true)

    if (gradYear != null && Number.isFinite(gradYear)) {
      query = query.eq("graduationyear", gradYear)
    }

    const { data, error } = await query
    if (error || !Array.isArray(data)) return EMPTY_STATS

    let male = 0
    let female = 0
    for (const row of data) {
      const g = normalizeGender((row as { gender?: unknown }).gender)
      if (g === "male") male++
      else if (g === "female") female++
    }
    return { total: data.length, male, female }
  } catch (e) {
    console.error("[home-data] loadHomeStats failed:", e instanceof Error ? e.message : e)
    return EMPTY_STATS
  }
}

/**
 * Top prospects per class for the rankings strip.
 *
 * Deliberately leaner than /api/public-rankings: that route enriches every athlete with
 * tournament bundles and classification maps, plus a link-resolution query across the whole
 * grad year. The home page only shows a photo, name, school, weight, and rank — so none of
 * that work is needed here. Still honors the published top-30 cap.
 */
export async function loadFeaturedRankings(
  gradYears: number[],
  perYear = 3,
  gender = "Male",
): Promise<HomeRankedProspect[]> {
  try {
    const supabase = createAdminClient()

    const perYearResults = await Promise.all(
      gradYears.map(async (year) => {
        const { data, error } = await supabase
          .from("athletes")
          .select("id, name, highschool, graduationyear, weightclass, prospect_ranking, photourl, headshot_url")
          .eq("graduationyear", year)
          .eq("gender", gender)
          .not("prospect_ranking", "is", null)
          .lte("prospect_ranking", getPublicRankingsMax(year))
          .order("prospect_ranking", { ascending: true })
          .limit(perYear)

        if (error || !Array.isArray(data)) return []

        return data.map((a: Record<string, any>): HomeRankedProspect => ({
          id: String(a.id ?? ""),
          name: a.name || "Unknown",
          highschool: a.highschool || "",
          graduationyear: Number(a.graduationyear) || year,
          photourl: a.photourl || a.headshot_url || "",
          weightclass: a.weightclass ? String(a.weightclass) : "",
          prospect_ranking: a.prospect_ranking ?? null,
        }))
      }),
    )

    return perYearResults.flat()
  } catch (e) {
    console.error("[home-data] loadFeaturedRankings failed:", e instanceof Error ? e.message : e)
    return []
  }
}

/** Placement chips only — no win/loss records (mirrors /api/featured-athletes). */
function honorSourceFieldsFromRow(athlete: Record<string, unknown>) {
  return {
    nhsca_2023_placement: athlete.nhsca_2023_placement ?? undefined,
    nhsca_2024_placement: athlete.nhsca_2024_placement ?? undefined,
    nhsca_2025_placement: athlete.nhsca_2025_placement ?? undefined,
    super_32_2023_placement: athlete.super_32_2023_placement ?? undefined,
    super_32_2024_placement: athlete.super_32_2024_placement ?? undefined,
    super_32_2025_placement: athlete.super_32_2025_placement ?? undefined,
  }
}

function commitmentTime(a: Record<string, any>): number {
  // commitmentdate is the real column; updated_at only stands in for the handful of rows
  // that never got one, so a dateless commit still lands somewhere sensible.
  return new Date(a.commitmentdate || a.updated_at || 0).getTime()
}

/**
 * Most recent commitments, newest first — the default branch of /api/featured-athletes.
 *
 * Note the source route ignores its `limit` param and always slices to 3; here the caller
 * actually controls it.
 *
 * The database does the ordering, then we re-sort in memory to apply the updated_at
 * fallback. Previously it took 500 rows in whatever order Postgres felt like returning
 * them and sorted those — fine at 159 commitments, but the moment the table passes 500
 * the newest commit could simply not be in the window, and the home page would quietly
 * lead with a stale one.
 */
export async function loadLatestCommits(limit = 3): Promise<Record<string, any>[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .not("college", "is", null)
      .neq("college", "")
      .order("commitmentdate", { ascending: false, nullsFirst: false })
      .limit(500)

    if (error || !Array.isArray(data) || data.length === 0) return []

    const sorted = [...data].sort((a, b) => commitmentTime(b) - commitmentTime(a)).slice(0, limit)

    const mapped = sorted.map((athlete: Record<string, any>) => ({
      id: athlete.id?.toString() || "",
      name: athlete.name || "Unknown",
      highschool: athlete.highschool || "Unknown High School",
      college: athlete.college || "Unknown College",
      division: "",
      graduationyear: athlete.graduationyear ?? null,
      photourl: athlete.commitmentPhotoUrl || athlete.photourl || "/wrestler-silhouette.png",
      weightclass: athlete.weightclass || "Unknown",
      college_weight_class:
        athlete.college_weight_class != null
          ? String(athlete.college_weight_class)
          : athlete.projected_weight != null
            ? String(athlete.projected_weight)
            : null,
      projected_weight:
        athlete.projected_weight != null
          ? String(athlete.projected_weight)
          : athlete.college_weight_class != null
            ? String(athlete.college_weight_class)
            : null,
      hs_weight_class: athlete.weightclass || "Unknown",
      wrestlingclub: athlete.wrestlingClub || athlete.wrestlingclub || "",
      club: athlete.wrestlingClub || athlete.wrestlingclub || "",
      wrestlingClub: athlete.wrestlingClub || athlete.wrestlingclub || "",
      achievements: Array.isArray(athlete.achievements)
        ? athlete.achievements
        : typeof athlete.achievements === "string"
          ? athlete.achievements.split(",").map((a: string) => a.trim()).filter(Boolean)
          : [],
      team: athlete.team || "",
      gender: athlete.gender || "Male",
      commitment_date: athlete.commitment_date || athlete.commitmentdate || athlete.updated_at || null,
      prospect_ranking: athlete.prospect_ranking ?? undefined,
      ...honorSourceFieldsFromRow(athlete),
    }))

    // Division lives on the colleges table, keyed by college_id on the raw row.
    try {
      const idToCollegeId = new Map<string, string>()
      for (const r of sorted) {
        if (r.id != null && r.college_id) idToCollegeId.set(String(r.id), r.college_id)
      }
      const collegeIds = [...new Set(idToCollegeId.values())]
      if (collegeIds.length) {
        const collegesMap = await getCollegesByIds(supabase, collegeIds)
        for (const a of mapped) {
          const cid = idToCollegeId.get(String(a.id))
          a.division = (cid ? collegesMap.get(cid)?.division : "") ?? ""
        }
      }
    } catch (e) {
      // Division is decoration on the card — never fail the section over it.
      console.error("[home-data] attachDivision failed:", e instanceof Error ? e.message : e)
    }

    return mapped
  } catch (e) {
    console.error("[home-data] loadLatestCommits failed:", e instanceof Error ? e.message : e)
    return []
  }
}

/**
 * Featured store products, shaped exactly like /api/store/featured-products.
 *
 * That route shuffles randomly per request. Server-rendering freezes the shuffle for the
 * whole revalidate window regardless, so this uses a stable order (featured first, newest
 * next) rather than pretending to be random — same products, no reshuffle on every load.
 */
export async function loadFeaturedStoreProducts(limit = 6): Promise<HomeStoreProduct[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select(
        `id, name, description, price, slug, category, featured, in_stock, display_order,
         product_images ( url, display_order, color )`,
      )
      .eq("in_stock", true)
      .eq("show_in_public_store", true)
      .order("featured", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(limit)

    if (error || !Array.isArray(data)) {
      if (error) console.error("[home-data] store products query failed:", error.message)
      return []
    }

    return data.map((product: Record<string, any>): HomeStoreProduct => {
      const images: Array<Record<string, any>> = product.product_images || []
      const primaryImage = images.find((img) => img.display_order === 0) || images[0]
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number.parseFloat(product.price) || 0,
        image_url: primaryImage?.url || null,
        slug: product.slug,
        category: product.category,
        featured: product.featured,
        in_stock: product.in_stock,
      }
    })
  } catch (e) {
    console.error("[home-data] loadFeaturedStoreProducts failed:", e instanceof Error ? e.message : e)
    return []
  }
}
