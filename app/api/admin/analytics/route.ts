import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "week" // day, week, month
    const schoolId = searchParams.get("schoolId") // optional filter by school

    const adminSupabase = createAdminClient()

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30) // Last 30 days
        break
      case "week":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 84) // Last 12 weeks
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()) // Last 12 months
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 84)
    }

    // Build query for recruits (college_coach_stars)
    // First, get coach user IDs for the school if filtering
    let recruitCoachUserIds: string[] | null = null
    if (schoolId) {
      const { data: coaches } = await adminSupabase
        .from("user_profiles")
        .select("user_id")
        .eq("school_id", schoolId)
      recruitCoachUserIds = coaches?.map((c) => c.user_id) || []
      if (recruitCoachUserIds.length === 0) {
        // No coaches for this school, return empty recruits
        recruitCoachUserIds = []
      }
    }

    let recruitsQuery = adminSupabase
      .from("college_coach_stars")
      .select("starred_at, coach_user_id")
      .gte("starred_at", startDate.toISOString())
      .order("starred_at", { ascending: true })

    if (schoolId && recruitCoachUserIds && recruitCoachUserIds.length > 0) {
      recruitsQuery = recruitsQuery.in("coach_user_id", recruitCoachUserIds)
    } else if (schoolId && recruitCoachUserIds && recruitCoachUserIds.length === 0) {
      // No coaches, return empty result
      recruitsQuery = recruitsQuery.eq("coach_user_id", "00000000-0000-0000-0000-000000000000") // Impossible ID
    }

    const { data: recruitsData, error: recruitsError } = await recruitsQuery

    if (recruitsError) {
      console.error("Error fetching recruits:", recruitsError)
      return NextResponse.json(
        { error: "Failed to fetch recruits data", details: recruitsError.message },
        { status: 500 },
      )
    }

    // Fetch coach school mappings for recruits
    const recruitCoachIds = [...new Set(recruitsData?.map((r: any) => r.coach_user_id).filter(Boolean) || [])]
    const recruitCoachSchoolMap: { [key: string]: string } = {}
    if (recruitCoachIds.length > 0) {
      const { data: recruitCoachesData } = await adminSupabase
        .from("user_profiles")
        .select("user_id, school_id")
        .in("user_id", recruitCoachIds)
      recruitCoachesData?.forEach((coach: any) => {
        if (coach.school_id) {
          recruitCoachSchoolMap[coach.user_id] = coach.school_id
        }
      })
    }

    // Fetch school names separately if we have school_ids
    const schoolIds = [...new Set(Object.values(recruitCoachSchoolMap).filter(Boolean))]
    const schoolNamesMap: { [key: string]: string } = {}
    if (schoolIds.length > 0) {
      const { data: schoolsData } = await adminSupabase
        .from("schools")
        .select("id, name")
        .in("id", schoolIds)
      schoolsData?.forEach((school: any) => {
        schoolNamesMap[school.id] = school.name
      })
    }

    // Build query for activities (recruiting_actions)
    // First, get coach user IDs for the school if filtering
    let coachUserIds: string[] | null = null
    if (schoolId) {
      const { data: coaches } = await adminSupabase
        .from("user_profiles")
        .select("user_id")
        .eq("school_id", schoolId)
      coachUserIds = coaches?.map((c) => c.user_id) || []
      if (coachUserIds.length === 0) {
        // No coaches for this school, return empty activities
        coachUserIds = []
      }
    }

    let activitiesQuery = adminSupabase
      .from("recruiting_actions")
      .select("action_date, action_type, coach_user_id")
      .gte("action_date", startDate.toISOString())
      .order("action_date", { ascending: true })

    if (schoolId && coachUserIds && coachUserIds.length > 0) {
      activitiesQuery = activitiesQuery.in("coach_user_id", coachUserIds)
    } else if (schoolId && coachUserIds && coachUserIds.length === 0) {
      // No coaches, return empty result
      activitiesQuery = activitiesQuery.eq("coach_user_id", "00000000-0000-0000-0000-000000000000") // Impossible ID
    }

    const { data: activitiesData, error: activitiesError } = await activitiesQuery

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError)
      return NextResponse.json(
        { error: "Failed to fetch activities data", details: activitiesError.message },
        { status: 500 },
      )
    }

    // Fetch coach school mappings for activities
    const activityCoachIds = [...new Set(activitiesData?.map((a: any) => a.coach_user_id).filter(Boolean) || [])]
    const coachSchoolMap: { [key: string]: string } = {}
    if (activityCoachIds.length > 0) {
      const { data: coachesData } = await adminSupabase
        .from("user_profiles")
        .select("user_id, school_id")
        .in("user_id", activityCoachIds)
      coachesData?.forEach((coach: any) => {
        if (coach.school_id) {
          coachSchoolMap[coach.user_id] = coach.school_id
        }
      })
    }

    // Get school names for activities
    const activitySchoolIds = [...new Set(Object.values(coachSchoolMap).filter(Boolean))]
    const activitySchoolNamesMap: { [key: string]: string } = {}
    if (activitySchoolIds.length > 0) {
      const { data: activitySchoolsData } = await adminSupabase
        .from("schools")
        .select("id, name")
        .in("id", activitySchoolIds)
      activitySchoolsData?.forEach((school: any) => {
        activitySchoolNamesMap[school.id] = school.name
      })
    }

    // Aggregate recruits by time period
    const recruitsByPeriod: { [key: string]: number } = {}
    const recruitsBySchool: { [key: string]: { name: string; count: number } } = {}

    recruitsData?.forEach((recruit: any) => {
      const date = new Date(recruit.starred_at)
      let periodKey: string

      switch (period) {
        case "day":
          periodKey = date.toISOString().split("T")[0] // YYYY-MM-DD
          break
        case "week":
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          periodKey = weekStart.toISOString().split("T")[0]
          break
        case "month":
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          break
        default:
          periodKey = date.toISOString().split("T")[0]
      }

      recruitsByPeriod[periodKey] = (recruitsByPeriod[periodKey] || 0) + 1

      // Aggregate by school
      const coachSchoolId = recruit.coach_user_id ? recruitCoachSchoolMap[recruit.coach_user_id] : null
      const schoolName = coachSchoolId ? schoolNamesMap[coachSchoolId] || "Unknown" : "Unknown"
      if (!recruitsBySchool[schoolName]) {
        recruitsBySchool[schoolName] = { name: schoolName, count: 0 }
      }
      recruitsBySchool[schoolName].count++
    })

    // Aggregate activities by time period
    const activitiesByPeriod: { [key: string]: number } = {}
    const activitiesByType: { [key: string]: number } = {}
    const activitiesBySchool: { [key: string]: { name: string; count: number } } = {}

    activitiesData?.forEach((activity: any) => {
      const date = new Date(activity.action_date)
      let periodKey: string

      switch (period) {
        case "day":
          periodKey = date.toISOString().split("T")[0]
          break
        case "week":
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          periodKey = weekStart.toISOString().split("T")[0]
          break
        case "month":
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          break
        default:
          periodKey = date.toISOString().split("T")[0]
      }

      activitiesByPeriod[periodKey] = (activitiesByPeriod[periodKey] || 0) + 1

      // Aggregate by type
      const actionType = activity.action_type || "other"
      activitiesByType[actionType] = (activitiesByType[actionType] || 0) + 1

      // Aggregate by school
      const coachSchoolId = activity.coach_user_id ? coachSchoolMap[activity.coach_user_id] : null
      const schoolName = coachSchoolId ? activitySchoolNamesMap[coachSchoolId] || "Unknown" : "Unknown"
      if (!activitiesBySchool[schoolName]) {
        activitiesBySchool[schoolName] = { name: schoolName, count: 0 }
      }
      activitiesBySchool[schoolName].count++
    })

    // Convert to arrays for charts
    const recruitsTimeline = Object.entries(recruitsByPeriod)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const activitiesTimeline = Object.entries(activitiesByPeriod)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const topSchoolsByRecruits = Object.values(recruitsBySchool)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topSchoolsByActivities = Object.values(activitiesBySchool)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const activitiesByTypeArray = Object.entries(activitiesByType).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
    }))

    // Calculate totals
    const totalRecruits = recruitsData?.length || 0
    const totalActivities = activitiesData?.length || 0

    return NextResponse.json({
      success: true,
      period,
      totals: {
        recruits: totalRecruits,
        activities: totalActivities,
      },
      recruitsTimeline,
      activitiesTimeline,
      topSchoolsByRecruits,
      topSchoolsByActivities,
      activitiesByType: activitiesByTypeArray,
    })
  } catch (error) {
    console.error("Error in analytics API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

