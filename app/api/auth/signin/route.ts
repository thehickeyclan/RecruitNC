import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const SIGNIN_TIMEOUT_MS = 12_000 // Fail fast so user sees an error instead of hanging

/**
 * Server-side sign-in for all users. Uses service role so Supabase anon-key
 * rate limits don't block production logins. Sets session cookies via SSR.
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

    const adminClient = createAdminClient()
    const signInPromise = adminClient.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    })
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Sign-in timed out")), SIGNIN_TIMEOUT_MS)
    )
    let result: Awaited<ReturnType<typeof adminClient.auth.signInWithPassword>>
    try {
      result = await Promise.race([signInPromise, timeoutPromise])
    } catch (err) {
      const msg = err instanceof Error && err.message === "Sign-in timed out"
        ? "Sign-in is taking too long. Please try again."
        : err instanceof Error ? err.message : "Login failed"
      const res = NextResponse.json({ error: msg }, { status: msg.includes("too long") ? 504 : 401 })
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
      return res
    }
    const authData = result.data
    const authError = result.error

    if (authError || !authData?.user || !authData?.session) {
      const res = NextResponse.json(
        { error: authError?.message || "Invalid credentials" },
        { status: 401 }
      )
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
      return res
    }

    const cookieStore = await cookies()
    const response = NextResponse.json({
      success: true,
      user: { id: authData.user.id, email: authData.user.email },
    })

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

    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    })

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
    return response
  } catch (error: unknown) {
    console.error("[auth/signin]", error)
    const res = NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    )
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0")
    return res
  }
}
