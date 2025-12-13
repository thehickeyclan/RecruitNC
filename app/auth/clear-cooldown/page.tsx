"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function ClearCooldownPage() {
  const [cleared, setCleared] = useState(false)
  const [error, setError] = useState("")

  const clearCooldown = async () => {
    try {
      // Clear from client-side storage
      if (typeof window !== "undefined") {
        // Clear sessionStorage
        sessionStorage.removeItem("rate_limit_cooldown")
        
        // Clear cookie with all possible combinations
        const cookieOptions = [
          "rate_limit_cooldown=; path=/; SameSite=None; Secure; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT",
          "rate_limit_cooldown=; path=/; SameSite=Lax; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT",
          "rate_limit_cooldown=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT",
          "rate_limit_cooldown=; path=/; domain=" + window.location.hostname + "; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT",
        ]
        
        cookieOptions.forEach(opt => {
          document.cookie = opt
        })
      }

      // Also call API to clear server-side
      try {
        await fetch("/api/auth/clear-cooldown", {
          method: "POST",
          credentials: "include",
        })
      } catch (apiError) {
        console.warn("API clear failed, but client-side cleared:", apiError)
      }

      setCleared(true)
      
      // Redirect to sign in after 1 second
      setTimeout(() => {
        window.location.href = "/auth/signin"
      }, 1000)
    } catch (err: any) {
      setError(err.message || "Failed to clear cooldown")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Clear Rate Limit Cooldown</CardTitle>
          <CardDescription>
            If you're seeing "Too many login attempts" errors, this will clear the cooldown and allow you to log in immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleared ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Cooldown cleared successfully! Redirecting to sign in page...
              </AlertDescription>
            </Alert>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will clear the rate limit cooldown that's preventing you from logging in.
                  You'll be able to attempt login immediately after clearing.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button onClick={clearCooldown} className="w-full" variant="default">
                  Clear Cooldown Now
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

