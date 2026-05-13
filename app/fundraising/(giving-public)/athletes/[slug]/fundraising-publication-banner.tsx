import type { ReactNode } from "react"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import { FundraisingActivationRequestButton } from "./fundraising-activation-request-button"

type PublicationTone = "verified" | "pending" | "unverified" | "neutral"

type Props = {
  athletePagePath: string
  fundraisingSlug: string
  athleteId: string | null
  displayName: string
  /** Parent linked or athlete&apos;s own RecruitNC login matches this profile */
  wiringReady: boolean
  slugHasPendingActivation: boolean
  viewerUserId: string | null
  viewerHasPendingActivation: boolean
  isFundraisingManager: boolean
}

function resolveTone({
  athleteId,
  wiringReady,
  slugHasPendingActivation,
}: Pick<Props, "athleteId" | "wiringReady" | "slugHasPendingActivation">): PublicationTone {
  if (!athleteId) return "neutral"
  if (wiringReady) return "verified"
  if (slugHasPendingActivation) return "pending"
  return "unverified"
}

const TONE_STYLES: Record<PublicationTone, { wrap: string; dot: string; title: string }> = {
  verified: {
    wrap: "border-emerald-500/45 bg-emerald-950/35",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
    title: "Family verified · page active",
  },
  pending: {
    wrap: "border-amber-500/45 bg-amber-950/35",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]",
    title: "Activation in review",
  },
  unverified: {
    wrap: "border-red-500/40 bg-red-950/30",
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]",
    title: "Verification not finished",
  },
  neutral: {
    wrap: "border-[#C8A94A]/40 bg-[#0B2545]/55",
    dot: "bg-[#C8A94A] shadow-[0_0_8px_rgba(200,169,74,0.4)]",
    title: "Official NC United gift page",
  },
}

export function FundraisingPublicationBanner({
  athletePagePath,
  fundraisingSlug,
  athleteId,
  displayName,
  wiringReady,
  slugHasPendingActivation,
  viewerUserId,
  viewerHasPendingActivation,
  isFundraisingManager,
}: Props) {
  const tone = resolveTone({ athleteId, wiringReady, slugHasPendingActivation })
  const s = TONE_STYLES[tone]

  const signInHref = `/auth/signin?returnTo=${encodeURIComponent(athletePagePath)}`

  const showRequestButton =
    !!athleteId &&
    isFundraisingManager &&
    !wiringReady &&
    !slugHasPendingActivation &&
    !!viewerUserId

  let body: ReactNode
  if (tone === "neutral") {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          Donations are tax-deductible to NC United Wrestling. If you&apos;re {displayName}&apos;s parent or guardian, sign in to
          request access to personalize this page and confirm it with your family.
        </p>
        {!viewerUserId ? (
          <p className="mt-2 text-xs">
            <HardLink href={signInHref} className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
              Sign in
            </HardLink>{" "}
            to request activation.
          </p>
        ) : isFundraisingManager ? (
          <FundraisingActivationRequestButton fundraisingSlug={fundraisingSlug} athleteId={athleteId} />
        ) : null}
      </>
    )
  } else if (tone === "verified") {
    body = (
      <p className="mt-1 text-xs leading-snug text-white/72">
        This public page is linked to a parent or athlete RecruitNC account. Only your family and NC United staff can edit the story
        or view private donor contact rows — not visitors.
      </p>
    )
  } else if (tone === "pending") {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          A family or staff activation request for this URL is in NC United&apos;s queue. Gifts still process normally; checkout is
          unchanged.
        </p>
        {viewerHasPendingActivation ? (
          <p className="mt-2 text-xs font-medium text-amber-100/90">You submitted a request — we&apos;ll follow up by email.</p>
        ) : null}
      </>
    )
  } else {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          This page is live for gifts, but it isn&apos;t linked to {displayName}&apos;s family RecruitNC account yet. We don&apos;t
          fundraise &quot;in someone&apos;s name&quot; without that wiring — if you&apos;re the parent or athlete on the account, ask
          NC United to finish activation.
        </p>
        {!viewerUserId ? (
          <p className="mt-2 text-xs">
            <HardLink href={signInHref} className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
              Sign in
            </HardLink>{" "}
            as the linked parent or athlete, then tap Request activation.
          </p>
        ) : null}
        {showRequestButton ? (
          <FundraisingActivationRequestButton fundraisingSlug={fundraisingSlug} athleteId={athleteId} />
        ) : null}
        {viewerUserId && !isFundraisingManager && !wiringReady ? (
          <p className="mt-2 text-xs text-white/50">
            Signed in as someone who isn&apos;t linked to this athlete yet — use Profile → family tools, or email{" "}
            <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
              info@ncwrestlingunited.com
            </a>
            .
          </p>
        ) : null}
      </>
    )
  }

  return (
    <div
      className={cn(
        "mt-6 flex gap-3 rounded-xl border px-4 py-3.5 sm:items-start",
        s.wrap,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn("mt-0.5 h-3 w-3 shrink-0 rounded-full sm:mt-1", s.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          Publication status
        </p>
        <p className="font-[family-name:var(--font-fundraising-display)] mt-1 text-sm font-black uppercase tracking-wide text-white">
          {s.title}
        </p>
        {body}
      </div>
    </div>
  )
}
