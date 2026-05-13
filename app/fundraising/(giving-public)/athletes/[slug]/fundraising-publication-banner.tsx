import type { ReactNode } from "react"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import { FundraisingActivationRequestButton } from "./fundraising-activation-request-button"

type PublicationTone = "live" | "pending" | "inactive" | "neutral"

type Props = {
  athletePagePath: string
  fundraisingSlug: string
  athleteId: string | null
  displayName: string
  /** Public Stripe embed allowed (staff turns on after activation approval). */
  checkoutLive: boolean
  slugHasPendingActivation: boolean
  viewerUserId: string | null
  viewerHasPendingActivation: boolean
  isFundraisingManager: boolean
}

function resolveTone({
  athleteId,
  checkoutLive,
  slugHasPendingActivation,
}: Pick<Props, "athleteId" | "checkoutLive" | "slugHasPendingActivation">): PublicationTone {
  if (!athleteId) return "neutral"
  if (checkoutLive) return "live"
  if (slugHasPendingActivation) return "pending"
  return "inactive"
}

const TONE_STYLES: Record<PublicationTone, { wrap: string; dot: string; title: string }> = {
  live: {
    wrap: "border-emerald-500/45 bg-emerald-950/35",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
    title: "Fundraising is live",
  },
  pending: {
    wrap: "border-amber-500/45 bg-amber-950/35",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]",
    title: "Activation in review",
  },
  inactive: {
    wrap: "border-sky-500/40 bg-sky-950/25",
    dot: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]",
    title: "Not taking gifts yet",
  },
  neutral: {
    wrap: "border-[#C8A94A]/40 bg-[#0B2545]/55",
    dot: "bg-[#C8A94A] shadow-[0_0_8px_rgba(200,169,74,0.4)]",
    title: "Official NC United page",
  },
}

export function FundraisingPublicationBanner({
  athletePagePath,
  fundraisingSlug,
  athleteId,
  displayName,
  checkoutLive,
  slugHasPendingActivation,
  viewerUserId,
  viewerHasPendingActivation,
  isFundraisingManager,
}: Props) {
  const tone = resolveTone({ athleteId, checkoutLive, slugHasPendingActivation })
  const s = TONE_STYLES[tone]

  const signInHref = `/auth/signin?returnTo=${encodeURIComponent(athletePagePath)}`

  const showRequestButton =
    !!athleteId &&
    isFundraisingManager &&
    !checkoutLive &&
    !slugHasPendingActivation &&
    !!viewerUserId

  let body: ReactNode
  if (tone === "neutral") {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          Public athlete pages exist for every roster wrestler. <strong className="text-white/90">Gifts stay off</strong> until NC United
          activates checkout after a parent or athlete completes activation. If you&apos;re {displayName}&apos;s parent or guardian, sign in
          to request activation.
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
  } else if (tone === "live") {
    body = (
      <p className="mt-1 text-xs leading-snug text-white/72">
        This page is activated for tax-deductible gifts. NC United has verified a family connection; checkout below credits{" "}
        <strong className="text-white/90">{displayName}</strong>. Parents and athletes with access can edit the story and goal; private
        donor contacts stay manager-only.
      </p>
    )
  } else if (tone === "pending") {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          <strong className="text-white/90">Checkout is off</strong> while NC United reviews an activation request. No gifts are accepted on
          this URL until activation is approved — use{" "}
          <HardLink href="/fundraising/give" className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
            Make a gift
          </HardLink>{" "}
          for the training fund or another active page if you need to give today.
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
          <strong className="text-white/90">This page is not accepting gifts yet.</strong> NC United turns on secure checkout only after a
          parent or athlete requests activation and staff approves — so we don&apos;t fundraise under a wrestler&apos;s name without that
          chain. You can still read about NC United below.
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
        {viewerUserId && !isFundraisingManager ? (
          <p className="mt-2 text-xs text-white/50">
            Signed in as an account not linked to this athlete yet — use Profile → family tools, or email{" "}
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
      className={cn("mt-6 flex gap-3 rounded-xl border px-4 py-3.5 sm:items-start", s.wrap)}
      role="status"
      aria-live="polite"
    >
      <span className={cn("mt-0.5 h-3 w-3 shrink-0 rounded-full sm:mt-1", s.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          Page status
        </p>
        <p className="font-[family-name:var(--font-fundraising-display)] mt-1 text-sm font-black uppercase tracking-wide text-white">
          {s.title}
        </p>
        {body}
      </div>
    </div>
  )
}
