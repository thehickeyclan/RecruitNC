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

    // After redirect (e.g. from auth callback), cookies/session can take time to be
    // available—especially on mobile. Retry getSession() multiple times before
    // we decide "no session" to avoid redirect loops.
    const checkDirectSessionWithRetries = async () => {
      const supabase = createClient()
      const maxTries = 4
      const delayMs = 800
      for (let tryNum = 0; tryNum < maxTries; tryNum++) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setDirectSessionCheck(true)
            setSessionCheckComplete(true)
            return
          }
        } catch (error) {
          console.warn("[v0] AuthGuard session check try", tryNum + 1, error)
        }
        if (tryNum < maxTries - 1) {
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }
      setDirectSessionCheck(false)
      setSessionCheckComplete(true)
    }

    // Initial wait for auth context and cookies after redirect (mobile needs more time)
    const timer = setTimeout(() => {
      checkDirectSessionWithRetries()
    }, 1200)
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
      // On mobile, session can appear late. Retry 2 more times before redirecting to signin.
      const doFinalRedirect = async () => {
        const supabase = createClient()
        for (let i = 0; i < 2; i++) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) return
          } catch (_) {}
          await new Promise((r) => setTimeout(r, 800))
        }
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session && !redirecting) {
            setRedirecting(true)
            router.push(`/auth/signin?returnTo=${encodeURIComponent(pathname)}`)
          }
        } catch (_) {
          if (!redirecting) {
            setRedirecting(true)
            router.push(`/auth/signin?returnTo=${encodeURIComponent(pathname)}`)
          }
        }
      }
      const redirectTimer = setTimeout(doFinalRedirect, 600)
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
