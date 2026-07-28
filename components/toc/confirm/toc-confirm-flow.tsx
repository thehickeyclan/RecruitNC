"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AthleteSearchTypeahead, type TocAthleteSearchResult } from "@/components/toc/confirm/athlete-search-typeahead"
import { AthleteVerificationCard } from "@/components/toc/confirm/athlete-verification-card"
import { ConfirmationForm } from "@/components/toc/confirm/confirmation-form"
import type { TocAthleteWithInvitation } from "@/lib/toc/invitation-service"
import { isTocAthleteId, TOC_INVALID_ATHLETE_LINK_MESSAGE } from "@/lib/toc/invitations"

type Step = "search" | "verify" | "form"

export function TocConfirmFlow() {
  const searchParams = useSearchParams()
  const prefillAthleteId = searchParams.get("athlete")

  const [step, setStep] = useState<Step>("search")
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profile, setProfile] = useState<TocAthleteWithInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (athleteId: string, skipVerification = false) => {
    if (!isTocAthleteId(athleteId)) {
      setError(TOC_INVALID_ATHLETE_LINK_MESSAGE)
      setProfile(null)
      setStep("search")
      return
    }

    setLoadingProfile(true)
    setError(null)
    try {
      const res = await fetch(`/api/toc/athletes/${encodeURIComponent(athleteId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load profile")
      const loadedProfile = data as TocAthleteWithInvitation
      setProfile(loadedProfile)
      setStep(skipVerification && loadedProfile.invitation?.status === "invited" ? "form" : "verify")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile")
      setProfile(null)
      setStep("search")
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
    if (prefillAthleteId) {
      void loadProfile(prefillAthleteId, true)
    }
  }, [prefillAthleteId, loadProfile])

  const onSearchSelect = (athlete: TocAthleteSearchResult) => {
    void loadProfile(athlete.id)
  }

  const reset = () => {
    setProfile(null)
    setStep("search")
    setError(null)
  }

  return (
    <div className="space-y-8">
      {(step === "search" || !profile) && !loadingProfile ? (
        <AthleteSearchTypeahead onSelect={onSearchSelect} disabled={loadingProfile} />
      ) : null}

      {loadingProfile ? (
        <div className="flex items-center gap-2 text-[#0B1D3A]/70 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your profile…
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {profile && step === "verify" ? (
        <AthleteVerificationCard
          data={profile}
          onConfirm={() => setStep("form")}
          onReject={reset}
        />
      ) : null}

      {profile && step === "form" && profile.invitation?.status === "invited" ? (
        <ConfirmationForm
          athleteId={profile.athlete.id}
          athleteName={profile.athlete.name}
          athleteSchool={profile.athlete.school}
          athleteClub={profile.athlete.club}
          athleteWeightClass={profile.athlete.weightClass}
          invitedWeightClass={profile.invitation.weightClass}
          onCheckout={(checkoutUrl) => {
            window.location.href = checkoutUrl
          }}
        />
      ) : null}
    </div>
  )
}
