import type { ReactNode } from "react"
import { HardLink } from "@/components/hard-link"

/**
 * Ribbon when this URL has an active `athlete_fundraising_profiles` row (NC United enabled this gift page).
 */
export function FundraisingAthleteActivationIndicator(props: {
  hasActivatedProfile: boolean
  signedIn: boolean
  /** Viewer manages fundraising for this athlete — donor tools connected */
  isFamilyConnected: boolean
  /** Path-only return URL for sign-in, e.g. `/fundraising/athletes/jane-doe` */
  signInReturnToPath: string
  latestActivationStatus?: "none" | "pending" | "approved" | "rejected"
}) {
  const { hasActivatedProfile, signedIn, isFamilyConnected, signInReturnToPath, latestActivationStatus = "none" } =
    props

  if (!hasActivatedProfile) return null

  const signInHref = `/auth/signin?returnTo=${encodeURIComponent(signInReturnToPath)}`

  let signedInHint: ReactNode = null
  if (signedIn && !isFamilyConnected) {
    if (latestActivationStatus === "pending") {
      signedInHint = null
    } else if (latestActivationStatus === "approved") {
      signedInHint = (
        <p className="text-[10px] leading-snug text-emerald-100/65">
          Staff approved your link — <strong className="text-emerald-50/90">refresh this page</strong>, then use Profile → Fundraise for donor tools.
        </p>
      )
    } else {
      signedInHint = (
        <p className="text-[10px] leading-snug text-white/52">
          Already linked to another login? Use the RecruitNC account that should manage this page, then request activation in{" "}
          <strong className="text-white/65">Family fundraising access</strong> below.
        </p>
      )
    }
  }

  return (
    <div className="flex max-w-[min(100%,17rem)] flex-col items-end gap-1 text-right">
      <div
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/45 px-2.5 py-1 backdrop-blur-sm"
        title="NC United has activated this fundraising page."
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]"
          aria-hidden
        />
        <span className="font-[family-name:var(--font-fundraising-display)] text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100/95">
          Activated
        </span>
      </div>

      {!signedIn ? (
        <p className="text-[10px] leading-snug text-white/52">
          <HardLink href={signInHref} className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
            Sign in
          </HardLink>{" "}
          with your RecruitNC account to request family activation if this is your athlete&apos;s page.
        </p>
      ) : (
        signedInHint
      )}
    </div>
  )
}
