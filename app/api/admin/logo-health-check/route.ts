import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all athletes to check their entity logos
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, high_school, college, club")
      .order("name")

    if (athletesError) {
      throw new Error(`Failed to fetch athletes: ${athletesError.message}`)
    }

    // Get all existing logo mappings
    const { data: logoMappings, error: logoError } = await supabase
      .from("logo_mappings")
      .select("entity_name, entity_type, logo_url")

    if (logoError) {
      throw new Error(`Failed to fetch logo mappings: ${logoError.message}`)
    }

    // Create a map for quick lookup
    const logoMap = new Map()
    logoMappings?.forEach((mapping) => {
      const key = `${mapping.entity_type}-${mapping.entity_name?.toLowerCase()}`
      logoMap.set(key, mapping.logo_url)
    })

    // Collect all unique entities
    const entities = {
      highschool: new Set<string>(),
      college: new Set<string>(),
      club: new Set<string>(),
    }

    athletes?.forEach((athlete) => {
      if (athlete.high_school) entities.highschool.add(athlete.high_school)
      if (athlete.college) entities.college.add(athlete.college)
      if (athlete.club) entities.club.add(athlete.club)
    })

    // Check logo status for each entity
    const logoStatus = {
      highschool: [] as any[],
      college: [] as any[],
      club: [] as any[],
    }

    // Check high schools
    entities.highschool.forEach((name) => {
      const key = `highschool-${name.toLowerCase()}`
      const logoUrl = logoMap.get(key)
      logoStatus.highschool.push({
        name,
        hasLogo: !!logoUrl,
        logoUrl: logoUrl || null,
        status: logoUrl ? (logoUrl.includes("placeholder") || logoUrl === "" ? "broken" : "good") : "missing",
      })
    })

    // Check colleges
    entities.college.forEach((name) => {
      const key = `college-${name.toLowerCase()}`
      const logoUrl = logoMap.get(key)
      logoStatus.college.push({
        name,
        hasLogo: !!logoUrl,
        logoUrl: logoUrl || null,
        status: logoUrl ? (logoUrl.includes("placeholder") || logoUrl === "" ? "broken" : "good") : "missing",
      })
    })

    // Check clubs
    entities.club.forEach((name) => {
      const key = `club-${name.toLowerCase()}`
      const logoUrl = logoMap.get(key)
      logoStatus.club.push({
        name,
        hasLogo: !!logoUrl,
        logoUrl: logoUrl || null,
        status: logoUrl ? (logoUrl.includes("placeholder") || logoUrl === "" ? "broken" : "good") : "missing",
      })
    })

    // Sort by status (missing/broken first)
    Object.keys(logoStatus).forEach((type) => {
      logoStatus[type as keyof typeof logoStatus].sort((a, b) => {
        if (a.status === "missing" && b.status !== "missing") return -1
        if (a.status === "broken" && b.status === "good") return -1
        if (a.status === "good" && b.status !== "good") return 1
        return a.name.localeCompare(b.name)
      })
    })

    // Calculate summary
    const summary = {
      total: {
        highschool: logoStatus.highschool.length,
        college: logoStatus.college.length,
        club: logoStatus.club.length,
      },
      missing: {
        highschool: logoStatus.highschool.filter((l) => l.status === "missing").length,
        college: logoStatus.college.filter((l) => l.status === "missing").length,
        club: logoStatus.club.filter((l) => l.status === "missing").length,
      },
      broken: {
        highschool: logoStatus.highschool.filter((l) => l.status === "broken").length,
        college: logoStatus.college.filter((l) => l.status === "broken").length,
        club: logoStatus.club.filter((l) => l.status === "broken").length,
      },
      good: {
        highschool: logoStatus.highschool.filter((l) => l.status === "good").length,
        college: logoStatus.college.filter((l) => l.status === "good").length,
        club: logoStatus.club.filter((l) => l.status === "good").length,
      },
    }

    return NextResponse.json({
      success: true,
      summary,
      entities: logoStatus,
    })
  } catch (error) {
    console.error("Logo health check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check logo health",
      },
      { status: 500 },
    )
  }
}
