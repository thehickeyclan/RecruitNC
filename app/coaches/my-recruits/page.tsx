"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"

export default function MyRecruitsRedirectPage() {
  const router = useRouter()
  const { profile, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && profile) {
      // Redirect admins to schools management
      if (profile.is_admin) {
        router.push("/admin/schools")
        return
      }

      // Redirect coaches with school_id to their branded portal
      if (profile.school_id) {
        router.push(`/schools/${profile.school_id}/portal`)
        return
      }

      // Coaches without school assignment stay on this error page
    }
  }, [isLoading, profile, router])

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="bg-gradient-to-r from-[#002147] to-[#13294B] text-white">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Access Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-gray-700">
            <strong>The generic "My Recruits" portal is not available.</strong>
          </p>
          <p className="text-gray-700">
            All coaches are assigned to their institution's custom branded recruiting portal.
          </p>
          <p className="text-gray-700">
            If you're a college coach and haven't been assigned to your school yet, please contact us at{" "}
            <a href="mailto:info@ncwrestlingunited.com" className="text-blue-600 hover:underline">
              info@ncwrestlingunited.com
            </a>
          </p>
          <div className="pt-4">
            <Button onClick={() => router.push("/contact")} className="bg-[#BC0B03] hover:bg-[#9a0902]">
              Contact Us
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
}
