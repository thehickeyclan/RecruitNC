"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Session, User } from "@supabase/supabase-js"
import { getUserProfile } from "@/app/actions/get-user-profile"

interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string
  first_name: string
  last_name: string
  role: "user" | "coach" | "college_coach" | "admin"
  verified_coach: boolean
  is_admin: boolean
  coaching_position?: string
  institution?: string
  school_id?: string
  profile_type?: string
  verification_status?: string
  created_at: string
  updated_at: string
}

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isCoach: boolean
  isVerifiedCoach: boolean
  signIn: (email: string, password: string) => Promise<{ error: any } & { data?: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

// Emergency safety: clear any stale Supabase auth cookies that can cause
// endless refresh loops (400/429 on token?grant_type=refresh_token).
const clearSupabaseCookies = () => {
  if (typeof document === "undefined") return

  const cookies = document.cookie.split("; ")
  const supabaseCookies = cookies.filter((c) => c.startsWith("sb-") || c.includes("supabase"))

  if (supabaseCookies.length === 0) return

  console.warn(
    "[v0] Clearing Supabase cookies to break auth refresh loop and prevent rate limiting.",
  )

  // Get all possible cookie names (including those that might be in the cookie string)
  const cookieNames = new Set<string>()
  supabaseCookies.forEach((cookie) => {
    const [name] = cookie.split("=")
    cookieNames.add(name.trim())
  })

  // Also check for common Supabase cookie patterns
  const allCookies = document.cookie.split("; ")
  allCookies.forEach((cookie) => {
    const [name] = cookie.split("=")
    if (name.trim().startsWith("sb-") || name.trim().includes("supabase")) {
      cookieNames.add(name.trim())
    }
  })

  // Clear cookies with multiple path/domain combinations to ensure they're deleted
  const paths = ["/", ""]
  const domains = [window.location.hostname, `.${window.location.hostname}`, ""]
  const sameSiteOptions = ["None", "Lax", "Strict", ""]

  cookieNames.forEach((name) => {
    // Try all combinations to ensure cookie is deleted
    paths.forEach((path) => {
      domains.forEach((domain) => {
        sameSiteOptions.forEach((sameSite) => {
          const domainPart = domain ? `; domain=${domain}` : ""
          const pathPart = path ? `; path=${path}` : ""
          const sameSitePart = sameSite ? `; SameSite=${sameSite}` : ""
          document.cookie = `${name}=;${domainPart}${pathPart}${sameSitePart}; Secure; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          document.cookie = `${name}=;${domainPart}${pathPart}${sameSitePart}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        })
      })
    })
  })

  // Also clear localStorage and sessionStorage
  try {
    const localStorageKeys = Object.keys(localStorage)
    localStorageKeys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-") || key.startsWith("sb-")) {
        localStorage.removeItem(key)
      }
    })
  } catch (e) {
    // Ignore localStorage errors
  }

  try {
    const sessionStorageKeys = Object.keys(sessionStorage)
    sessionStorageKeys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-") || key.startsWith("sb-")) {
        sessionStorage.removeItem(key)
      }
    })
  } catch (e) {
    // Ignore sessionStorage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const authStateChangeCount = useRef(0)
  const lastAuthStateChange = useRef(Date.now())
  const isRefreshing = useRef(false)

  const isAdmin = profile?.is_admin === true || profile?.role === "admin"
  const isCoach =
    profile?.role === "coach" ||
    profile?.role === "college_coach" ||
    profile?.role === "admin" ||
    profile?.verified_coach === true
  const isVerifiedCoach = profile?.verified_coach === true || isAdmin
  const isAuthenticated = !!user && !!session

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log("[v0] Fetching profile for user:", userId)
      const data = (await getUserProfile(userId)) as any

      if (!data) {
        console.error("[v0] Profile fetch returned null")
        return null
      }

      console.log("[v0] Profile fetched successfully:", {
        user_id: data.user_id,
        is_admin: data.is_admin,
        role: data.role,
      })

      return data as UserProfile
    } catch (error: any) {
      console.error("[v0] Profile fetch exception:", error.message || error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      console.log("[v0] Refreshing profile")
      const profileData = await fetchUserProfile(user.id)
      setProfile(profileData)
    }
  }

  useEffect(() => {
    console.log("[v0] AuthProvider initializing")

    const getSessionWithTimeout = async () => {
      try {
        // Check if we're in a rate limit cooldown period
        if (typeof window !== "undefined") {
          const rateLimitCooldown = sessionStorage.getItem("rate_limit_cooldown")
          if (rateLimitCooldown) {
            const cooldownTime = parseInt(rateLimitCooldown, 10)
            const now = Date.now()
            // Cooldown is 60 seconds (60000ms)
            if (now < cooldownTime + 60000) {
              const remainingSeconds = Math.ceil((cooldownTime + 60000 - now) / 1000)
              console.warn(
                `[v0] Rate limit cooldown active. Waiting ${remainingSeconds} more seconds before attempting auth.`,
              )
              // Clear cookies during cooldown to prevent automatic refresh attempts
              clearSupabaseCookies()
              setSession(null)
              setUser(null)
              setProfile(null)
              setIsLoading(false)
              return
            } else {
              // Cooldown expired, clear it
              sessionStorage.removeItem("rate_limit_cooldown")
            }
          }
        }

        let hasSupabaseCookies = false

        if (typeof document !== "undefined") {
          const cookies = document.cookie
          const hasCookies = cookies && cookies.includes("sb-")
          hasSupabaseCookies = !!hasCookies
          console.log(
            "[v0] Browser cookies:",
            hasCookies ? "present" : "none",
            "| Cookie count:",
            cookies.split(";").length,
          )

          // If no cookies, immediately set loading to false and skip session check
          if (!hasCookies) {
            console.log("[v0] No Supabase cookies found, skipping session check")
            setSession(null)
            setUser(null)
            setProfile(null)
            setIsLoading(false)
            return
          }
        }

        // Only try to get session if we have cookies
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log("[v0] Initial session:", { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error: sessionError?.message 
        })

        // Check for rate limit errors
        if (sessionError && (
          sessionError.message?.includes("rate limit") ||
          sessionError.message?.includes("429") ||
          sessionError.message?.includes("Too many")
        )) {
          console.warn("[v0] Rate limit detected on session load, clearing cookies and setting cooldown")
          clearSupabaseCookies()
          // Set cooldown period to prevent further attempts
          if (typeof window !== "undefined") {
            sessionStorage.setItem("rate_limit_cooldown", Date.now().toString())
          }
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        // If we had Supabase cookies but there is no session, this usually means
        // the refresh token is invalid/stale and causing repeated 400/429 errors.
        // Proactively clear those cookies so the browser stops hammering refresh.
        if (hasSupabaseCookies && !session) {
          console.log("[v0] Clearing stale cookies (no valid session)")
          clearSupabaseCookies()
        }

        if (session?.user) {
          // Fetch profile in background, don't block rendering
          fetchUserProfile(session.user.id).then(setProfile)
        }

        // Always set loading to false immediately
        setIsLoading(false)
      } catch (error: any) {
        console.error("[v0] getSession error:", error.message)
        
        // If it's a rate limit error, clear cookies and set cooldown
        const errorMsg = error.message || error.toString() || ""
        if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("Too many")) {
          console.warn("[v0] Rate limit exception on session load, clearing cookies and setting cooldown")
          clearSupabaseCookies()
          // Set cooldown period to prevent further attempts
          if (typeof window !== "undefined") {
            sessionStorage.setItem("rate_limit_cooldown", Date.now().toString())
          }
        }
        
        setSession(null)
        setUser(null)
        setProfile(null)
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log("[v0] Auth loading timeout reached after 3s, forcing isLoading to false")
        setIsLoading(false)
      }
    }, 3000)

    getSessionWithTimeout()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const now = Date.now()
      const timeSinceLastChange = now - lastAuthStateChange.current

      // If we're getting auth state changes too frequently (more than 5 per second), ignore them
      if (timeSinceLastChange < 200) {
        authStateChangeCount.current++
        if (authStateChangeCount.current > 5) {
          console.warn("[v0] Auth state changing too frequently, ignoring to prevent loop")
          return
        }
      } else {
        // Reset counter if enough time has passed
        authStateChangeCount.current = 0
      }

      lastAuthStateChange.current = now

      console.log("[v0] Auth state changed:", event, { hasSession: !!session })

      if (event === "SIGNED_OUT" && !user && !session) {
        console.log("[v0] Already signed out, ignoring duplicate SIGNED_OUT event")
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user && !isRefreshing.current) {
        isRefreshing.current = true
        fetchUserProfile(session.user.id)
          .then(setProfile)
          .finally(() => {
            isRefreshing.current = false
          })
      } else if (!session?.user) {
        setProfile(null)
        isRefreshing.current = false
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    try {
      console.log("[v0] Signing in:", email)
      
      // Clear any existing stale cookies BEFORE attempting sign in
      // This prevents rate limiting issues from expired refresh tokens
      clearSupabaseCookies()
      
      // Clear rate limit cooldown when user explicitly attempts to sign in
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("rate_limit_cooldown")
        // Also try to clear the cookie (though it's httpOnly, we try)
        document.cookie = "rate_limit_cooldown=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      }
      
      const res = await supabase.auth.signInWithPassword({ email, password })

      if (!res.error) {
        console.log("[v0] Sign in successful")
      } else if (res.error.message?.includes("rate limit") || res.error.message?.includes("429") || res.error.message?.includes("Too many")) {
        console.error("[v0] Rate limit detected on sign in:", res.error)
        // Clear cookies and set cooldown
        clearSupabaseCookies()
        if (typeof window !== "undefined") {
          sessionStorage.setItem("rate_limit_cooldown", Date.now().toString())
        }
        return { 
          error: { 
            message: "Too many login attempts. Please wait 60 seconds and try again."
          } 
        }
      }

      return res
    } catch (err: any) {
      console.error("[v0] Sign in error:", err)
      
      // Check if it's a rate limit error
      const errorMsg = err.message || err.toString() || ""
      if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("Too many")) {
        // Clear cookies and set cooldown
        clearSupabaseCookies()
        if (typeof window !== "undefined") {
          sessionStorage.setItem("rate_limit_cooldown", Date.now().toString())
        }
        return { 
          error: { 
            message: "Too many login attempts. Please wait 60 seconds and try again."
          } 
        }
      }
      
      return { error: { message: err.message || "Sign in failed" } }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata || {},
      },
    })
    return { error }
  }

  const signOut = async () => {
    console.log("[v0] Signing out")
    
    // Clear cookies first to prevent any refresh attempts
    clearSupabaseCookies()
    
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Ignore errors on signout - we're clearing everything anyway
      console.warn("[v0] Sign out error (ignoring):", error)
    }
    
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated,
        isAdmin,
        isCoach,
        isVerifiedCoach,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
