"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"

/**
 * This page is deprecated. All coaches should use their custom school portal.
 * Access: /schools/[schoolId]/portal
 */
export default function CoachPortalPage() {
  const { profile } = useAuth()

  // Redirect coaches with a school_id to their custom branded portal
  useEffect(() => {
    if (profile?.school_id) {
      console.log("[Coach Portal] Redirecting to branded portal for school:", profile.school_id)
      window.location.href = `/schools/${profile.school_id}/portal`
    }
  }, [profile])

  // Show loading while redirecting
  if (profile?.school_id) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your recruiting portal...</p>
        </div>
      </div>
      </AuthGuard>
    )
  }

  // For coaches without a school_id, show access denied
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Portal Access Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              The generic coach portal is no longer available. All coaches now have access to custom,
              school-branded recruiting portals.
            </p>
            <p className="mb-4">
              If you are a college coach and need access to your school's recruiting portal, please
              contact the NC United Wrestling admin team.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">For Administrators:</h3>
            <p className="text-sm text-blue-800">
              To set up a custom portal for your school, please use the admin dashboard to assign
              coaches to their respective schools. Each school automatically gets a branded portal
              at <code className="bg-white px-2 py-1 rounded">/schools/[schoolId]/portal</code>
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/contact">
              <Button>Contact Support</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
}
