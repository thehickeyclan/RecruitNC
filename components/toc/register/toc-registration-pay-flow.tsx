"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AthleteSearchTypeahead, type TocAthleteSearchResult } from "@/components/toc/confirm/athlete-search-typeahead"
import { TocRegistrationPayCard } from "@/components/toc/register/toc-registration-pay-card"
import type { TocAthleteWithInvitation } from "@/lib/toc/invitation-service"
import { isTocAthleteId, TOC_INVALID_ATHLETE_LINK_MESSAGE } from "@/lib/toc/invitations"

export function TocRegistrationPayFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillAthleteId = searchParams.get("athlete")
  const cancelled = searchParams.get("cancelled") === "1"

  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profile, setProfile] = useState<TocAthleteWithInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(
    async (athleteId: string) => {
      if (!isTocAthleteId(athleteId)) {
        setError(TOC_INVALID_ATHLETE_LINK_MESSAGE)
        setProfile(null)
        return
      }

      setLoadingProfile(true)
      setError(null)
      try {
        const res = await fetch(`/api/toc/athletes/${encodeURIComponent(athleteId)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not load profile")
        setProfile(data as TocAthleteWithInvitation)
        if (data.invitation?.paymentStatus === "paid") {
          router.push("/tournament-of-champions/register/success")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load profile")
        setProfile(null)
      } finally {
        setLoadingProfile(false)
      }
    },
    [router],
  )

  useEffect(() => {
    if (prefillAthleteId) {
      void loadProfile(prefillAthleteId)
    }
  }, [prefillAthleteId, loadProfile])

  const onSearchSelect = (athlete: TocAthleteSearchResult) => {
    void loadProfile(athlete.id)
  }

  return (
    <div className="space-y-8">
      {cancelled ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-4 py-3">
          Checkout was cancelled. You can try again when ready.
        </p>
      ) : null}

      {!profile && !loadingProfile ? (
        <AthleteSearchTypeahead onSelect={onSearchSelect} disabled={loadingProfile} />
      ) : null}

      {loadingProfile ? (
        <div className="flex items-center gap-2 text-[#0B1D3A]/70 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your registration…
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {profile ? (
        <TocRegistrationPayCard
          data={profile}
          onReset={() => {
            setProfile(null)
            setError(null)
          }}
        />
      ) : null}
    </div>
  )
}
