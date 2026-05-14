"use client"

import { HardLink } from "@/components/hard-link"
import { FundraisingActivationRequestButton } from "@/app/fundraising/(giving-public)/athletes/[slug]/fundraising-activation-request-button"

type Props = {
  athletePagePath: string
  fundraisingSlug: string
  athleteId: string | null
  displayName: string
  viewerUserId: string | null
  viewerHasPendingActivation: boolean
}

export function UnactivatedAthleteGivingPromo({
  athletePagePath,
  fundraisingSlug,
  athleteId,
  displayName,
  viewerUserId,
  viewerHasPendingActivation,
}: Props) {
  const signInHref = `/auth/signin?returnTo=${encodeURIComponent(athletePagePath)}`

  if (viewerHasPendingActivation) {
    return (
      <p className="mt-1 text-sm text-white/55">
        We received your activation request and will follow up using your account email. To give today, use{" "}
        <HardLink href="/fundraising/give" className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
          Make a gift
        </HardLink>
        .
      </p>
    )
  }

  const showRequestCta = !!viewerUserId

  return (
    <p className="mt-1 text-sm text-white/55">
      {displayName}&apos;s fundraising page is not yet active for gifts.{" "}
      {showRequestCta ? (
        <FundraisingActivationRequestButton fundraisingSlug={fundraisingSlug} athleteId={athleteId} variant="inlineLink" />
      ) : (
        <HardLink href={signInHref} className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
          Sign in to request activation →
        </HardLink>
      )}
    </p>
  )
}
