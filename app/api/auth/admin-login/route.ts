import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Server-side admin login that bypasses Supabase rate limits
 * Uses service role key to authenticate, then creates a session
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

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || "Invalid credentials" },
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", authData.user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Create a session using the regular client (with cookies)
    // We need to set the session cookie so the client can use it
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      session: authData.session,
    })

    // Set the session cookies manually
    if (authData.session) {
      // Set access token cookie
      response.cookies.set(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`, JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
        token_type: authData.session.token_type,
        user: authData.session.user,
      }), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: authData.session.expires_in || 3600,
        path: "/",
      })
    }

    return response
  } catch (error: any) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 500 }
    )
  }
}

