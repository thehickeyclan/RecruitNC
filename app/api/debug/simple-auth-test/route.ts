import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("🔍 Testing server auth setup...")

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log("🔍 Environment check:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl?.substring(0, 30) + "...",
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey,
          },
        },
        { status: 500 },
      )
    }

    // Test Supabase connection
    const supabase = createClient()

    // Try to get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("🔍 User check:", {
      hasUser: !!user,
      userEmail: user?.email,
      userError: userError?.message,
    })

    // Try a simple database query
    const { data: testData, error: dbError } = await supabase.from("athletes").select("id, name").limit(1)

    console.log("🔍 Database check:", {
      canQuery: !dbError,
      dbError: dbError?.message,
      hasData: !!testData,
      dataCount: testData?.length || 0,
    })

    return NextResponse.json({
      status: "Server auth test complete",
      environment: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      },
      user: {
        hasUser: !!user,
        userEmail: user?.email || null,
        userId: user?.id || null,
        userError: userError?.message || null,
      },
      database: {
        canQuery: !dbError,
        dbError: dbError?.message || null,
        hasData: !!testData,
        dataCount: testData?.length || 0,
      },
    })
  } catch (error) {
    console.error("🔍 Server auth test error:", error)
    return NextResponse.json(
      {
        error: "Server auth test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
