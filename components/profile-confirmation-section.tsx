"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, User, Mail, Phone } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface ProfileConfirmationSectionProps {
  athleteId: string
  athleteName: string
}

interface ConfirmationStatus {
  is_confirmed: boolean
  confirmed_by?: string
  confirmed_at?: string
  confirmation_method?: string
}

export function ProfileConfirmationSection({ athleteId, athleteName }: ProfileConfirmationSectionProps) {
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchConfirmationStatus()
  }, [athleteId])

  const fetchConfirmationStatus = async () => {
    try {
      const response = await fetch(`/api/athletes/${athleteId}/confirmation-status`)
      if (response.ok) {
        const data = await response.json()
        setConfirmationStatus(data)
      }
    } catch (error) {
      console.error("Error fetching confirmation status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmProfile = async () => {
    if (!user) return

    setConfirming(true)
    try {
      const response = await fetch("/api/athletes/confirm-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          athlete_id: athleteId,
          confirmed_by: user.id,
          confirmation_method: "self_confirmation",
        }),
      })

      if (response.ok) {
        await fetchConfirmationStatus()
      }
    } catch (error) {
      console.error("Error confirming profile:", error)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-8 border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-3">
          <User className="h-6 w-6 text-blue-600" />
          Profile Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {confirmationStatus?.is_confirmed ? (
          <div className="flex items-start gap-4">
            <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Verified Profile
                </Badge>
              </div>
              <p className="text-gray-700 mb-2">This profile has been verified and confirmed as accurate.</p>
              {confirmationStatus.confirmed_at && (
                <p className="text-sm text-gray-500">
                  Confirmed on {new Date(confirmationStatus.confirmed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-amber-200 text-amber-700">
                  Unverified Profile
                </Badge>
              </div>
              <p className="text-gray-700 mb-4">
                This profile has not yet been verified. If this is your profile, you can confirm its accuracy.
              </p>

              {user ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleConfirmProfile}
                    disabled={confirming}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {confirming ? "Confirming..." : "Confirm This Is My Profile"}
                  </Button>
                  <p className="text-xs text-gray-500">
                    By confirming, you verify that the information on this profile is accurate.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    To verify this profile, please sign in or create an account.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href="/auth/signin">Sign In</a>
                    </Button>
                    <Button size="sm" asChild>
                      <a href="/auth/signup">Create Account</a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Need to update information?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4" />
              <span>Email corrections to info@ncunited.com</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span>Call (555) 123-4567</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/request-edit">Request Edit</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
