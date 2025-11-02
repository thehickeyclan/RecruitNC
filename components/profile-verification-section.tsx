"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"

interface Athlete {
  id: string
  name?: string
  profile_verified?: boolean
  profile_claimed?: boolean
  claimed_by_user_id?: string
  verification_status?: string
  [key: string]: any
}

interface ProfileVerificationSectionProps {
  athlete: Athlete | null
}

export function ProfileVerificationSection({ athlete }: ProfileVerificationSectionProps) {
  const [verificationStatus, setVerificationStatus] = useState<{
    verified: boolean
    claimed: boolean
    status: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkVerificationStatus() {
      try {
        const response = await fetch(`/api/athletes/${athlete?.id}/confirmation-status`)
        if (response.ok) {
          const data = await response.json()
          setVerificationStatus({
            verified: data.verified || athlete?.profile_verified || false,
            claimed: data.claimed || athlete?.profile_claimed || false,
            status: data.status || athlete?.verification_status || "unverified",
          })
        } else {
          // Fallback to athlete data
          setVerificationStatus({
            verified: athlete?.profile_verified || false,
            claimed: athlete?.profile_claimed || false,
            status: athlete?.verification_status || "unverified",
          })
        }
      } catch (error) {
        console.error("Error checking verification status:", error)
        // Fallback to athlete data
        setVerificationStatus({
          verified: athlete?.profile_verified || false,
          claimed: athlete?.profile_claimed || false,
          status: athlete?.verification_status || "unverified",
        })
      } finally {
        setLoading(false)
      }
    }

    if (athlete) {
      checkVerificationStatus()
    }
  }, [athlete])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Checking verification status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!verificationStatus || !athlete) {
    return null
  }

  const getStatusIcon = () => {
    if (verificationStatus.verified) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (verificationStatus.claimed) {
      return <Clock className="h-5 w-5 text-yellow-500" />
    } else {
      return <XCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    if (verificationStatus.verified) {
      return "Verified Profile"
    } else if (verificationStatus.status === "pending" || verificationStatus.claimed) {
      return "Verification Pending"
    } else {
      return "Unverified Profile"
    }
  }

  const getStatusBadge = () => {
    if (verificationStatus.verified) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Verified
        </Badge>
      )
    } else if (verificationStatus.status === "pending" || verificationStatus.claimed) {
      return (
        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-gray-600">
          Unverified
        </Badge>
      )
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium text-gray-900">{getStatusText()}</p>
              <p className="text-sm text-gray-600">
                {verificationStatus.verified
                  ? "This profile has been verified."
                  : verificationStatus.status === "pending" || verificationStatus.claimed
                    ? "This profile is awaiting verification."
                    : "This profile has not been verified yet."}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardContent>
    </Card>
  )
}
