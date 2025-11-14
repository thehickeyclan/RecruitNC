import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const step = searchParams.get("step")

  try {
    const supabase = createClient()

    switch (step) {
      case "Check API Response":
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/athletes`)
          const data = await response.json()
          
          return NextResponse.json({
            success: response.ok,
            message: response.ok 
              ? `API responded with ${data.athletes?.length || 0} athletes`
              : `API failed with status ${response.status}`,
            data: {
              status: response.status,
              athletesCount: data.athletes?.length || 0,
              success: data.success,
              error: data.error
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }

      case "Check Authentication":
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          return NextResponse.json({
            success: !error && !!session,
            message: session 
              ? `Authenticated as ${session.user.email}`
              : error 
                ? `Auth error: ${error.message}`
                : "No session found",
            data: {
              hasSession: !!session,
              userEmail: session?.user?.email,
              error: error?.message
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Auth check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }

      case "Check Database Connection":
        try {
          const { data, error } = await supabase.from("athletes").select("count", { count: "exact" })
          
          return NextResponse.json({
            success: !error,
            message: error 
              ? `Database error: ${error.message}`
              : `Database connected, found ${data?.length || 0} records`,
            data: {
              connected: !error,
              count: data?.length || 0,
              error: error?.message
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }

      case "Check Athletes Count":
        try {
          const { data, error } = await supabase
            .from("athletes")
            .select("id, name, college")
            .limit(5)
          
          return NextResponse.json({
            success: !error && data && data.length > 0,
            message: error 
              ? `Query error: ${error.message}`
              : `Found ${data?.length || 0} athletes`,
            data: {
              count: data?.length || 0,
              sample: data?.slice(0, 3),
              error: error?.message
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Athletes query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }

      case "Check Data Structure":
        try {
          const { data, error } = await supabase
            .from("athletes")
            .select("*")
            .limit(1)
          
          if (error) {
            return NextResponse.json({
              success: false,
              message: `Data structure check failed: ${error.message}`,
              data: { error: error.message }
            })
          }

          const athlete = data?.[0]
          const hasRequiredFields = athlete && athlete.name && athlete.college

          return NextResponse.json({
            success: hasRequiredFields,
            message: hasRequiredFields 
              ? "Data structure looks good"
              : "Missing required fields in athlete data",
            data: {
              sampleAthlete: athlete,
              hasName: !!athlete?.name,
              hasCollege: !!athlete?.college,
              fields: athlete ? Object.keys(athlete) : []
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Data structure check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }

      case "Check Filters":
        try {
          const { data: allAthletes, error: allError } = await supabase
            .from("athletes")
            .select("college")
          
          if (allError) {
            return NextResponse.json({
              success: false,
              message: `Filter check failed: ${allError.message}`,
              data: { error: allError.message }
            })
          }

          const athletesWithColleges = allAthletes?.filter(a => a.college && a.college.trim() !== "") || []
          
          return NextResponse.json({
            success: true,
            message: `Filter check: ${athletesWithColleges.length} athletes have colleges out of ${allAthletes?.length || 0} total`,
            data: {
              totalAthletes: allAthletes?.length || 0,
              athletesWithColleges: athletesWithColleges.length,
              athletesWithoutColleges: (allAthletes?.length || 0) - athletesWithColleges.length
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Filter check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }

      default:
        return NextResponse.json({
          success: false,
          message: "Unknown diagnostic step",
          data: { step }
        })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}
