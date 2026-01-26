"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, isLoading, isAdmin, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false)
  const [directSessionCheck, setDirectSessionCheck] = useState<boolean | null>(null)

  useEffect(() => {
    console.log("[v0] AuthGuard state:", {
      pathname,
      requireAdmin,
      hasUser: !!user,
      isLoading,
      isAdmin,
      hasProfile: !!profile,
    })
  }, [user, isLoading, isAdmin, profile, pathname, requireAdmin])

  useEffect(() => {
    setMounted(true)
    
    // On desktop, cookies can take longer to be available after redirect
    // Directly check Supabase session to verify cookies are actually set
    const checkDirectSession = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setDirectSessionCheck(!!session)
        console.log("[v0] Direct session check:", { hasSession: !!session, hasUser: !!user })
      } catch (error) {
        console.error("[v0] Direct session check error:", error)
        setDirectSessionCheck(false)
      }
    }
    
    // Give auth context time to load session after page load/redirect
    // This prevents redirect loops after successful login
    // Increased delay for desktop browsers which may take longer to set cookies
    const timer = setTimeout(async () => {
      // Double-check session directly from Supabase (especially important on desktop)
      await checkDirectSession()
      setSessionCheckComplete(true)
    }, 1500) // Wait 1.5 seconds for session to load from cookies (longer for desktop)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Wait for component to mount, loading to complete, AND session check to complete
    if (!mounted || isLoading || !sessionCheckComplete || directSessionCheck === null) {
      console.log("[v0] AuthGuard waiting:", { 
        mounted, 
        isLoading, 
        sessionCheckComplete, 
        directSessionCheck 
      })
      return
    }

    // Prevent redirect loop - don't redirect if already on signin page
    if (pathname?.startsWith("/auth/signin")) {
      return
    }

    // On desktop, sometimes the auth context user is null but direct session check shows a session exists
    // In this case, wait a bit more for the context to catch up
    const hasSession = user || directSessionCheck

    if (!hasSession && !redirecting) {
      console.log("[v0] No user or session after checks, waiting 500ms more before redirect...")
      const redirectTimer = setTimeout(async () => {
        // Final check - verify session directly one more time
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (!session && !redirecting) {
            console.log("[v0] Still no session after delay, redirecting to signin")
            setRedirecting(true)
            router.push(`/auth/signin?returnTo=${encodeURIComponent(pathname)}`)
          } else {
            console.log("[v0] Session found after delay, no redirect needed")
          }
        } catch (error) {
          console.error("[v0] Final session check error:", error)
          if (!redirecting) {
            setRedirecting(true)
            router.push(`/auth/signin?returnTo=${encodeURIComponent(pathname)}`)
          }
        }
      }, 500)
      return () => clearTimeout(redirectTimer)
    } else if (requireAdmin && !isAdmin && user) {
      console.log("[v0] Admin access check:", {
        userEmail: user.email,
        isAdmin,
        profileIsAdmin: profile?.is_admin,
      })
    }
  }, [mounted, isLoading, sessionCheckComplete, directSessionCheck, user, requireAdmin, isAdmin, pathname, router, redirecting, profile])

  if (!mounted || isLoading || !sessionCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Redirecting...</p>
        </div>
      </div>
    )
  }

  // On desktop, sometimes directSessionCheck shows a session but user is null
  // Give it a moment to sync - show loading instead of immediately redirecting
  if (!user && directSessionCheck === false) {
    // Will redirect via useEffect
    return null
  }
  
  // If we have a direct session but no user yet, show loading
  if (!user && directSessionCheck === true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading session...</p>
        </div>
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-start md:items-center justify-center pt-8 md:pt-0 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">Signed in as: {user.email}</p>
            <p className="text-sm text-gray-600 mb-2">User ID: {user.id}</p>
            <p className="text-sm text-gray-600 mb-2">Profile is_admin: {profile?.is_admin ? "true" : "false"}</p>
            <p className="text-xs text-gray-500 mb-4">
              If you should have admin access, please check your user profile in the database (user_profiles.is_admin
              should be true)
            </p>
            <Button onClick={() => router.push("/")} variant="outline" className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is authenticated and has required permissions
  return <>{children}</>
}
