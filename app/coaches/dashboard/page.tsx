"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { redirect } from "next/navigation"

export default function CoachDashboard() {
  const { isVerifiedCoach, isLoading, profile, isAdmin } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isVerifiedCoach && !isAdmin) {
        redirect("/auth/signin")
      } else if (profile?.school_id) {
        redirect(`/schools/${profile.school_id}/portal`)
      } else {
        redirect("/coach-portal") // Fallback to legacy page (which will also redirect)
      }
    }
  }, [isLoading, isVerifiedCoach, isAdmin, profile])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting to your recruiting portal...</p>
      </div>
    </div>
  )
}
