"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, User, Edit, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ClaimProfileButtonProps {
  athleteId: string
  athleteName: string
  className?: string
  // New: allow the parent to explicitly tell us a profile is already claimed
  isClaimed?: boolean
}

export function ClaimProfileButton({ athleteId, athleteName, className, isClaimed }: ClaimProfileButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; nextStep?: string } | null>(null)
  const [claimed, setClaimed] = useState<boolean | null>(isClaimed ?? null)

  const { user } = useAuth()

  // If the parent didn't provide isClaimed, fetch a lightweight status from the API.
  useEffect(() => {
    let cancelled = false
    async function checkClaim() {
      if (isClaimed !== undefined) return
      try {
        const resp = await fetch(`/api/athletes/${athleteId}`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!resp.ok) return
        const data = await resp.json()
        // Consider claimed if there is any claimed_by_user_id set
        const alreadyClaimed = Boolean(data?.claimed_by_user_id)
        if (!cancelled) {
          setClaimed(alreadyClaimed)
        }
      } catch {
        // ignore network errors here; we just fail open to show the CTA
      }
    }
    checkClaim()
    return () => {
      cancelled = true
    }
  }, [athleteId, isClaimed])

  const redirectToSignIn = () => {
    const returnTo = encodeURIComponent(`/athletes/${athleteId}`)
    const url = `/auth/signin?returnTo=${returnTo}`
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.top!.location.href = url
    } else {
      window.location.href = url
    }
  }

  const handleClaimProfile = async () => {
    if (!user) {
      redirectToSignIn()
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/athletes/claim-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Profile claimed successfully!",
          nextStep: data.nextStep,
        })
        setClaimed(true)
      } else if (response.status === 401) {
        setResult({
          success: false,
          message: "Your session expired. Please sign in again to claim your profile.",
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to claim profile",
        })
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  // If already claimed (via prop or via fetch), don't render the Claim CTA at all.
  if (claimed === true) {
    return null
  }

  // Success state
  if (result?.success) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className ?? ""}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Profile Claimed Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-green-700 mb-4">
            Great! You now control this profile. Please verify that all your information is correct.
          </p>
          <div className="space-y-3">
            <div className="bg-white/70 rounded-lg p-3 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Next Steps:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Review all profile information below</li>
                <li>• Check your achievements and stats</li>
                <li>• Update any incorrect details</li>
                <li>• Upload a better photo if needed</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={`/athletes/${athleteId}/edit-request`} className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <Edit className="h-4 w-4 mr-2" />
                  Update My Info
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 border-green-300 text-green-700 hover:bg-green-100 bg-transparent"
                onClick={() => {
                  const el = document.getElementById("profile-verification")
                  if (el) el.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Verify Info Below
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (result && !result.success) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className ?? ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Claim Failed</span>
          </div>
          <p className="text-sm text-red-600 mb-3">{result.message}</p>
          <div className="flex gap-2">
            <Button
              onClick={handleClaimProfile}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
            >
              {isLoading ? "Trying Again..." : "Try Again"}
            </Button>
            <Button onClick={redirectToSignIn} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Sign In Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default state
  return (
    <Card className={`border-blue-200 bg-blue-50 ${className ?? ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Is this your profile?</h3>
            <p className="text-sm text-blue-700">
              Claim this profile to manage your information and connect with coaches.
            </p>
          </div>
        </div>
        <div className="mt-3">
          {!user && (
            <Button onClick={redirectToSignIn} className="w-full bg-blue-600 hover:bg-blue-700">
              Sign In to Claim Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ClaimProfileButton
