"use client"

import { HardLink } from "@/components/hard-link"
import { FundraisingActivationRequestButton } from "@/app/fundraising/(giving-public)/athletes/[slug]/fundraising-activation-request-button"

const SIGN_IN_CTA_CLASS =
  "font-[family-name:var(--font-fundraising-display)] mt-4 flex min-h-[56px] w-full touch-manipulation items-center justify-center rounded-sm bg-[#C8A94A] px-6 py-4 text-center text-sm font-extrabold uppercase tracking-[0.12em] text-[#061224] shadow-[0_14px_40px_-12px_rgba(200,169,74,0.5)] hover:bg-[#d4b75c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A94A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061224]"

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
  const showRequestCta = !!viewerUserId

  if (viewerHasPendingActivation) {
    return (
      <div
        className="mt-6 rounded-xl border-2 border-amber-400/40 bg-amber-500/10 px-4 py-5 sm:px-6 sm:py-6"
        role="status"
      >
        <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-amber-200/95">
          Activation request received
        </p>
        <p className="mt-3 text-sm leading-relaxed text-amber-50/95">
          NC United will follow up using your account email. To give today, use{" "}
          <HardLink href="/fundraising/give" className="font-semibold text-white underline-offset-2 hover:underline">
            Make a gift
          </HardLink>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-[#C8A94A]/55 bg-[#0B2545]/95 px-4 py-5 shadow-[0_20px_60px_-20px_rgba(200,169,74,0.35)] sm:px-6 sm:py-6">
      <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.22em] text-[#C8A94A]">
        Gift page not active yet
      </p>
      <p className="mt-3 text-base font-semibold leading-snug text-white sm:text-lg">
        {displayName}&apos;s page is ready to preview, but <span className="text-white/90">secure checkout stays off</span> until NC United
        approves activation.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        {showRequestCta
          ? "Linked family: tap the button below — we’ll use your signed-in email for staff review."
          : "Parents and athletes: sign in (or create an account), then tap the button to request activation."}
      </p>
      {showRequestCta ? (
        <FundraisingActivationRequestButton
          fundraisingSlug={fundraisingSlug}
          athleteId={athleteId}
          variant="hero"
          label="Request activation"
        />
      ) : (
        <HardLink href={signInHref} className={SIGN_IN_CTA_CLASS}>
          Sign in to request activation
        </HardLink>
      )}
      <p className="mt-4 text-center text-[11px] leading-snug text-white/45">
        After approval, donors will see “Donate now” and checkout on this page.
      </p>
    </div>
  )
}
