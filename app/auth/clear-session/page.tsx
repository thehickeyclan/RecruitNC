"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function ClearSessionPage() {
  const [cleared, setCleared] = useState(false)

  const clearAuthState = () => {
    if (typeof document === "undefined") return

    // Clear all Supabase cookies
    const cookies = document.cookie.split("; ")
    const supabaseCookies = cookies.filter((c) => c.startsWith("sb-"))

    supabaseCookies.forEach((cookie) => {
      const [name] = cookie.split("=")
      document.cookie = `${name}=; path=/; SameSite=None; Secure; max-age=0`
    })

    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage)
    localStorageKeys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        localStorage.removeItem(key)
      }
    })

    // Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage)
    sessionStorageKeys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        sessionStorage.removeItem(key)
      }
    })

    setCleared(true)

    // Reload after 2 seconds
    setTimeout(() => {
      window.location.href = "/auth/signin"
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Clear Authentication Session</CardTitle>
          <CardDescription>
            If you're experiencing login issues or rate limit errors, this tool will clear your authentication state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleared ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Authentication state cleared successfully! Redirecting to sign in page...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Clear all authentication cookies</li>
                    <li>Remove stored session data</li>
                    <li>Log you out of your account</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button onClick={clearAuthState} className="w-full" variant="destructive">
                  Clear Authentication State
                </Button>
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    Cancel - Return to Sign In
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

