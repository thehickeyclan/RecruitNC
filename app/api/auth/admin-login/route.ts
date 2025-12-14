import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Retry helper with exponential backoff for handling Supabase rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a rate limit error
      const isRateLimit = 
        error?.message?.includes("rate limit") ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too many") ||
        error?.status === 429 ||
        error?.code === "429"
      
      // Only retry on rate limit errors and if we have retries left
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
        console.warn(`[Admin Login] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Not a rate limit or out of retries
      throw error
    }
  }
  
  throw lastError
}

/**
 * Server-side admin login that bypasses Supabase rate limits
 * Uses service role key to authenticate, then sets session via SSR client
 * Includes retry logic with exponential backoff for server-side rate limits
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
    
    // Sign in using service role with retry logic for server-side rate limits
    // Even service role can hit Supabase's server-side rate limits
    const authData = await retryWithBackoff(async () => {
      const { data, error } = await adminClient.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        // Check if it's a rate limit error
        const isRateLimit = 
          error.message?.includes("rate limit") ||
          error.message?.includes("429") ||
          error.message?.includes("Too many")
        
        if (isRateLimit) {
          // Throw as rate limit error to trigger retry
          const rateLimitError: any = new Error(error.message)
          rateLimitError.status = 429
          rateLimitError.code = "429"
          throw rateLimitError
        }
        
        // Other errors, throw normally
        throw error
      }
      
      if (!data?.user || !data?.session) {
        throw new Error("Invalid response from authentication")
      }
      
      return data
    }, 3, 1000) // 3 retries, starting at 1 second

    // authData is now guaranteed to have user and session after retry logic

    // Verify user is admin (with retry for rate limits)
    const profile = await retryWithBackoff(async () => {
      const { data, error } = await adminClient
        .from("user_profiles")
        .select("is_admin")
        .eq("user_id", authData.user.id)
        .single()
      
      if (error) {
        const isRateLimit = 
          error.message?.includes("rate limit") ||
          error.message?.includes("429") ||
          error.message?.includes("Too many")
        
        if (isRateLimit) {
          const rateLimitError: any = new Error(error.message)
          rateLimitError.status = 429
          throw rateLimitError
        }
        throw error
      }
      
      return data
    }, 2, 500) // 2 retries for profile check, shorter delay

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
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

    return response
  } catch (error: any) {
    console.error("Admin login error:", error)
    
    // Check if it's a rate limit error
    const isRateLimit = 
      error?.message?.includes("rate limit") ||
      error?.message?.includes("429") ||
      error?.message?.includes("Too many") ||
      error?.status === 429
    
    if (isRateLimit) {
      return NextResponse.json(
        { 
          error: "Supabase is currently rate limiting. Please wait a few minutes and try again.",
          rateLimited: true,
          retryAfter: 60 // seconds
        },
        { 
          status: 429,
          headers: {
            "Retry-After": "60"
          }
        }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: error.status || 500 }
    )
  }
}

