import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

export const dynamic = "force-dynamic"

// Types kept loose to tolerate different sources
type AnyAthlete = Record<string, any>

function norm(text: unknown): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // punctuation to spaces
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeDivision(raw: unknown): "DI" | "DII" | "DIII" | "NAIA" | "NJCAA" | "Independent" | null {
  const v = norm(raw)
  if (!v) return null

  // Non-NCAA buckets first
  if (/\bnaia\b/.test(v)) return "NAIA"
  if (/\bn?jcaa\b/.test(v) || /\bjuco\b/.test(v) || /\bjunior college\b/.test(v) || /\bcommunity college\b/.test(v))
    return "NJCAA"
  if (/\bindependent\b/.test(v) || /\bncaa independent\b/.test(v)) return "Independent"

  // Order matters: check DIII, then DII, then DI to avoid overlaps
  const isD3 =
    /\bdivision\s*iii\b/.test(v) ||
    /\bd\s*iii\b/.test(v) ||
    /\bdiii\b/.test(v) ||
    /\bd3\b/.test(v) ||
    /\bdiv\s*3\b/.test(v) ||
    /\bdivision\s*3\b/.test(v) ||
    /\bncaa\s*d\s*iii\b/.test(v) ||
    /\bncaa\s*division\s*iii\b/.test(v)
  if (isD3) return "DIII"

  const isD2 =
    /\bdivision\s*ii\b/.test(v) ||
    /\bd\s*ii\b/.test(v) ||
    /\bdii\b/.test(v) ||
    /\bd2\b/.test(v) ||
    /\bdiv\s*2\b/.test(v) ||
    /\bdivision\s*2\b/.test(v) ||
    /\bncaa\s*d\s*ii\b/.test(v) ||
    /\bncaa\s*division\s*ii\b/.test(v)
  if (isD2) return "DII"

  const isD1 =
    // Use negative lookahead to avoid matching 'ii'/'iii'
    /\bdivision\s*i(?!i)\b/.test(v) ||
    /\bd\s*i(?!i)\b/.test(v) ||
    /\bdi(?!i)\b/.test(v) ||
    /\bd1\b/.test(v) ||
    /\bdiv\s*1\b/.test(v) ||
    /\bdivision\s*1\b/.test(v) ||
    /\bncaa\s*di(?!i)\b/.test(v) ||
    /\bncaa\s*division\s*i(?!i)\b/.test(v)
  if (isD1) return "DI"

  return null
}

function normalizeGender(raw: unknown): "male" | "female" | "other" {
  const v = norm(raw)
  if (v === "m" || v === "male" || v === "man" || v === "boy") return "male"
  if (v === "f" || v === "female" || v === "woman" || v === "girl") return "female"
  return "other"
}

function extractGradYear(a: Record<string, any>): number | null {
  // Include your actual column name 'graduationyear' first for precedence
  const candidates = [
    a.graduationyear, // <-- support schema's graduationyear
    a.graduationYear,
    a.graduation_year,
    a.gradYear,
    a.grad_year,
    a.classOf,
    a.class_of,
    a.year,
  ]

  for (const c of candidates) {
    if (c === null || c === undefined) continue
    const n =
      typeof c === "number" ? c : typeof c === "string" ? Number.parseInt(c.replace(/[^\d]/g, ""), 10) : Number.NaN
    if (Number.isFinite(n) && n >= 1990 && n <= 2100) return n
  }
  return null
}

function extractDivision(a: AnyAthlete): string | null {
  const candidates = [
    a.division,
    a.collegeDivision,
    a.college_division,
    a.ncaaDivision,
    a.ncaa_division,
    a.committedDivision,
    a.committed_division,
  ]
  for (const c of candidates) {
    const d = normalizeDivision(c)
    if (d) return d
  }
  return null
}

function extractGender(a: AnyAthlete): "male" | "female" | "other" {
  const candidates = [a.gender, a.sex]
  for (const c of candidates) {
    const g = normalizeGender(c)
    if (g !== "other") return g
  }
  return "other"
}

async function fetchFromInternalAPIs(origin: string): Promise<AnyAthlete[] | null> {
  const endpoints = ["/api/athletes", "/api/mock-athletes"]
  for (const path of endpoints) {
    try {
      console.log(`[v0] Stats API: Attempting to fetch from: ${origin}${path}`)
      const res = await fetch(`${origin}${path}`, { cache: "no-store" })
      console.log(`[v0] Stats API: Response status: ${res.status} ${res.statusText}`)

      if (!res.ok) {
        console.log(`[v0] Stats API: Failed to fetch from ${path}: ${res.status} ${res.statusText}`)
        const errorText = await res.text().catch(() => "Unable to read error response")
        console.log(`[v0] Stats API: Error response body: ${errorText}`)
        continue
      }

      const data = await res.json()
      console.log(`[v0] Stats API: Response data structure:`, Object.keys(data))
      console.log(
        `[v0] Stats API: Athletes array length:`,
        Array.isArray(data) ? data.length : Array.isArray(data?.athletes) ? data.athletes.length : "N/A",
      )

      if (Array.isArray(data)) return data
      if (Array.isArray(data?.athletes)) return data.athletes
      if (Array.isArray(data?.data)) return data.data
    } catch (error) {
      console.error(`[v0] Stats API: Error fetching from ${path}:`, error)
      console.error(`[v0] Stats API: Error type:`, error instanceof Error ? error.constructor.name : typeof error)
      console.error(`[v0] Stats API: Error message:`, error instanceof Error ? error.message : String(error))
    }
  }
  console.log(`[v0] Stats API: All internal API endpoints failed`)
  return null
}

async function fetchAthletes(req: Request): Promise<AnyAthlete[]> {
  const url = new URL(req.url)
  const yearParam = url.searchParams.get("year")
  const filterYear = yearParam ? Number.parseInt(yearParam) : null

  // 1) Try database via Supabase (if available)
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("athletes")
      .select("*")
      .not("college", "is", null)
      .neq("college", "")
      .neq("is_prospect", true)

    if (filterYear) {
      query = query.eq("graduationyear", filterYear)
    }

    const { data, error } = await query
    if (!error && Array.isArray(data)) return data as AnyAthlete[]
  } catch {
    // ignore and fall back
  }

  // 2) Fallback to internal APIs
  try {
    const origin = new URL(req.url).origin
    const internal = await fetchFromInternalAPIs(origin)
    if (internal) {
      if (filterYear) {
        return internal.filter((a) => extractGradYear(a) === filterYear)
      }
      return internal
    }
  } catch {
    // ignore
  }

  // 3) Final fallback: empty set
  return []
}

export async function GET(req: Request) {
  try {
    const athletes = await fetchAthletes(req)

    let total = 0
    let male = 0
    let female = 0

    // Initialize all buckets so the UI always sees the same keys
    let DI = 0,
      DII = 0,
      DIII = 0,
      NAIA = 0,
      NJCAA = 0,
      Independent = 0

    const yearCounts: Record<string, number> = {
      "2025": 0,
      "2026": 0,
      other: 0,
    }

    // Resolve division from college_division_mappings (single source of truth)
    const divisionStrings = await Promise.all(
      athletes.map((a) => getDivisionFromMappings((a as AnyAthlete).college ?? "")),
    )

    for (let i = 0; i < athletes.length; i++) {
      const a = athletes[i]
      total++

      // Gender
      const g = extractGender(a)
      if (g === "male") male++
      else if (g === "female") female++

      // Division (from mappings, then normalize to bucket)
      const div = normalizeDivision(divisionStrings[i])
      if (div === "DI") DI++
      else if (div === "DII") DII++
      else if (div === "DIII") DIII++
      else if (div === "NAIA") NAIA++
      else if (div === "NJCAA") NJCAA++
      else if (div === "Independent") Independent++

      // Year
      const y = extractGradYear(a)
      if (y === 2025) yearCounts["2025"]++
      else if (y === 2026) yearCounts["2026"]++
      else yearCounts.other++
    }

    const divisionBreakdown = {
      DI,
      DII,
      DIII,
      NAIA,
      NJCAA,
      Independent,
      // legacy aliases for backward-compatibility
      D1: DI,
      D2: DII,
      D3: DIII,
    }

    const payload = {
      success: true,
      stats: {
        totalAthletes: total,
        genderBreakdown: { male, female },
        divisionBreakdown,
        yearBreakdown: yearCounts,
      },
    }

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        "CDN-Cache-Control": "public, s-maxage=1800",
        "Vercel-CDN-Cache-Control": "public, s-maxage=1800",
      },
    })
  } catch (err) {
    // Never throw; always respond with a safe payload
    return NextResponse.json(
      {
        success: true,
        stats: {
          totalAthletes: 0,
          genderBreakdown: { male: 0, female: 0 },
          divisionBreakdown: {
            DI: 0,
            DII: 0,
            DIII: 0,
            NAIA: 0,
            NJCAA: 0,
            Independent: 0,
            D1: 0,
            D2: 0,
            D3: 0,
          },
          yearBreakdown: { "2025": 0, "2026": 0, other: 0 },
        },
        error: "Failed to compute stats",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    )
  }
}
