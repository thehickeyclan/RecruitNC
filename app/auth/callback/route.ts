import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  console.log("[v0] ===== AUTH CALLBACK ROUTE CALLED =====")

  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next") || "/"

  console.log("[v0] Callback params:", {
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
    next,
    fullUrl: req.url,
    origin: requestUrl.origin,
  })

  if (!code && !tokenHash) {
    console.error("[v0] No code or token_hash provided in callback")
    return NextResponse.redirect(new URL("/auth/signin?error=no_code", requestUrl.origin))
  }

  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
                sameSite: "lax", // Better mobile compatibility
                secure: process.env.NODE_ENV === "production",
                path: "/",
              })
            } catch (error) {
              console.error("[v0] Cookie set error:", error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({
                name,
                value: "",
                ...options,
                maxAge: 0,
                path: "/",
              })
            } catch (error) {
              console.error("[v0] Cookie remove error:", error)
            }
          },
        },
      },
    )

    let session: { user: { id: string }; user_metadata?: Record<string, unknown> } | null = null
    let exchangeError: { message?: string } | null = null

    if (tokenHash && type) {
      // Password reset / magic link: verifyOtp (token_hash flow)
      console.log("[v0] Verifying OTP (token_hash flow)...")
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "signup" | "invite" | "magiclink" | "email_change",
      })
      session = data?.session ?? null
      exchangeError = error
    } else if (code) {
      // PKCE flow: exchangeCodeForSession
      console.log("[v0] Exchanging code for session...")
      const result = await supabase.auth.exchangeCodeForSession(code)
      session = result.data?.session ?? null
      exchangeError = result.error
    }

    if (exchangeError) {
      console.error("[v0] Code exchange error:", exchangeError)
      return NextResponse.redirect(
        new URL(
          `/auth/signin?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`,
          requestUrl.origin,
        ),
      )
    }

    if (!session) {
      console.error("[v0] No session after code exchange")
      return NextResponse.redirect(new URL("/auth/signin?error=no_session", requestUrl.origin))
    }

    console.log("[v0] Session established successfully for user:", session.user.id)

    const { data: profile, error: profileFetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (profileFetchError && profileFetchError.code !== "PGRST116") {
      console.error("[v0] Profile fetch error:", profileFetchError)
    }

    if (!profile) {
      console.log("[v0] Creating user profile...")

      const profileType = session.user.user_metadata?.profile_type || session.user.user_metadata?.profileType || ""
      let role: "user" | "coach" | "admin" = "user"
      let verifiedCoach = false

      const isCollegeCoach =
        profileType === "college" || profileType === "coach" || profileType === "college-coach"
      const isCoachProfile = isCollegeCoach || profileType === "hs-club-coach"
      if (isCoachProfile) {
        role = "coach"
        verifiedCoach = isCollegeCoach // Only college coaches get contact/GPA access; admin assigns school later. HS/club coaches stay unverified.
      }

      const { error: insertError } = await supabase.from("user_profiles").insert({
        user_id: session.user.id,
        email: session.user.email!,
        full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.fullName || "",
        first_name: session.user.user_metadata?.first_name || session.user.user_metadata?.firstName || "",
        last_name: session.user.user_metadata?.last_name || session.user.user_metadata?.lastName || "",
        cell_phone: session.user.user_metadata?.cell_phone || session.user.user_metadata?.cellPhone || "",
        profile_type: profileType,
        role,
        verified_coach: verifiedCoach,
        is_admin: false,
      })

      if (insertError) {
        console.error("[v0] Profile creation error:", insertError)
      } else {
        console.log("[v0] User profile created with role:", role)
      }
    }

    let redirectPath = next && next !== "/" ? next : "/"

    // Password reset flow: send to reset-password page so they can set new password
    if (type === "recovery") {
      redirectPath = "/auth/reset-password"
    } else if (profile?.role === "coach" || session.user.user_metadata?.profile_type === "college-coach") {
      redirectPath = "/coaches/dashboard"
    } else if (profile?.role === "admin" || profile?.is_admin) {
      redirectPath = "/admin"
    } else if (session.user.user_metadata?.profile_type === "athlete") {
      redirectPath = "/athletes"
    }

    console.log("[v0] Redirecting authenticated user to:", redirectPath)

    const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("[v0] Callback error:", error)
    return NextResponse.redirect(
      new URL(`/auth/signin?error=callback_error&message=${encodeURIComponent(String(error))}`, requestUrl.origin),
    )
  }
}
