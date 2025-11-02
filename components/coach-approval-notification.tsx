"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

export function CoachApprovalNotification() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const checkAndShowNotification = async () => {
      // Only check for college coaches who are verified
      if (!user || !profile) return
      if (profile.profile_type !== "college-coach" && profile.profile_type !== "college_coach") return
      if (!profile.verified_coach) return

      // Check if notification has already been shown
      if (profile.approval_notification_shown === true) return

      // Show the approval notification
      toast({
        title: "🎉 Access Granted!",
        description:
          "Your college coach profile has been approved! You now have access to view athlete contact information on athlete profiles.",
        duration: 8000,
      })

      // Mark notification as shown
      const supabase = createClient()
      await supabase.from("user_profiles").update({ approval_notification_shown: true }).eq("id", profile.id)
    }

    checkAndShowNotification()
  }, [user, profile, toast])

  return null
}
