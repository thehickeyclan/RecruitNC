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
  /** This viewer already has a pending request for this slug. */
  viewerHasPendingActivation: boolean
  viewerUserId: string | null
}

function resolveTone({
  athleteId,
  checkoutLive,
  viewerHasPendingActivation,
}: Pick<Props, "athleteId" | "checkoutLive" | "viewerHasPendingActivation">): PublicationTone {
  if (checkoutLive) return "live"
  if (viewerHasPendingActivation) return "pending"
  if (!athleteId) return "neutral"
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
  viewerHasPendingActivation,
  viewerUserId,
}: Props) {
  const tone = resolveTone({ athleteId, checkoutLive, viewerHasPendingActivation })
  const s = TONE_STYLES[tone]

  const signInHref = `/auth/signin?returnTo=${encodeURIComponent(athletePagePath)}`

  /** Any signed-in user may request — staff verify identity via stored email + user_id before approve. */
  const showRequestButton = !!viewerUserId && !checkoutLive && !viewerHasPendingActivation

  let body: ReactNode
  if (tone === "neutral") {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          Public athlete pages exist for every roster wrestler. <strong className="text-white/90">Gifts stay off</strong> until NC United
          activates checkout after someone on the family requests it and staff approves. Sign in below to request activation for{" "}
          <strong className="text-white/90">{displayName}</strong> — we&apos;ll use your account email to verify before turning gifts on.
        </p>
        {!viewerUserId ? (
          <p className="mt-2 text-xs">
            <HardLink href={signInHref} className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
              Sign in
            </HardLink>{" "}
            to request activation.
          </p>
        ) : showRequestButton ? (
          <FundraisingActivationRequestButton fundraisingSlug={fundraisingSlug} athleteId={athleteId} />
        ) : null}
      </>
    )
  } else if (tone === "live") {
    body = (
      <p className="mt-1 text-xs leading-snug text-white/72">
        This page is activated for tax-deductible gifts. NC United has verified a family connection; checkout below credits{" "}
        <strong className="text-white/90">{displayName}</strong>. Linked family accounts can edit the story and goal; private donor contacts
        stay manager-only.
      </p>
    )
  } else if (tone === "pending") {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          <strong className="text-white/90">Checkout is off</strong> while NC United reviews your activation request for this page. No gifts
          are accepted on this URL until staff approves — use{" "}
          <HardLink href="/fundraising/give" className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
            Make a gift
          </HardLink>{" "}
          for the training fund or another active page if you need to give today.
        </p>
        <p className="mt-2 text-xs font-medium text-amber-100/90">We received your request — we&apos;ll follow up using your account email.</p>
      </>
    )
  } else {
    body = (
      <>
        <p className="mt-1 text-xs leading-snug text-white/72">
          <strong className="text-white/90">This page is not accepting gifts yet.</strong> NC United turns on secure checkout after you request
          activation (sign in required) and staff approves — so we don&apos;t fundraise under a wrestler&apos;s name without that review. You
          can still read about NC United below.
        </p>
        {!viewerUserId ? (
          <p className="mt-2 text-xs">
            <HardLink href={signInHref} className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
              Sign in
            </HardLink>{" "}
            to request activation — we&apos;ll record your account email for staff review.
          </p>
        ) : null}
        {showRequestButton ? (
          <FundraisingActivationRequestButton fundraisingSlug={fundraisingSlug} athleteId={athleteId} />
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
