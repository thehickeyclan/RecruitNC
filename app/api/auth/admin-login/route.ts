import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server-side admin login that bypasses Supabase rate limits
 * Uses service role key to authenticate, then sets session via SSR client
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Use service role client to bypass rate limits
    const adminClient = createAdminClient()
    
    // Sign in using service role (bypasses rate limits)
    const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData?.user || !authData?.session) {
      const res = NextResponse.json(
        { error: authError?.message || "Invalid credentials" },
        { status: 401 }
      )
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
      return res
    }

    // Verify user is admin
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", authData.user.id)
      .single()

    if (!profile?.is_admin) {
      const res = NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
      return res
    }

    // Now use SSR client to set the session cookies properly
    const cookieStore = await cookies()
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })

    // Create SSR client that will set cookies properly
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
              })
              response.cookies.set(name, value, {
                ...options,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
              })
            })
          },
        },
      },
    )

    // Set the session using SSR client (this will set cookies properly)
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
    return response
  } catch (error: any) {
    console.error("Admin login error:", error)
    const res = NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 500 }
    )
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
    return res
  }
}

