"use client"

import { useSearchParams } from "next/navigation"
import { SpartanDonateFormClassic } from "./spartan-donate-form-classic"
import { SpartanDonateFormWizard } from "./spartan-donate-form-wizard"

type SpartanDonateFormProps = {
  /** When true (e.g. `/fundraising/give`): donate-only entry, hub palette — no Race vs Donate split. */
  fundraisingHub?: boolean
  fundraisingHubPrefillCode?: string | null
  fundraisingHubPrefillLabel?: string | null
  fundraisingHubReturnSlug?: string | null
  /** Start on NC United Training Fund path (wizard). */
  fundraisingHubDefaultTrainingFund?: boolean
}

/**
 * Default: step-by-step wizard. Fallback to single-page (last shipped pre-wizard UI), same `/api/spartan/checkout`:
 * - `?classic=1` … — **ignored on `/fundraising/*` checkout** (hub paths always use the wizard so Stripe returns to the hub/athlete thanks URL, not `/spartan`).
 * - `NEXT_PUBLIC_SPARTAN_CLASSIC_CHECKOUT=1` — all visitors get classic ( emergency rollback in Vercel)
 *
 * `SpartanDonateForm` must stay inside `<Suspense>` (see donation-section) because of `useSearchParams`.
 */
export function SpartanDonateForm({
  fundraisingHub = false,
  fundraisingHubPrefillCode = null,
  fundraisingHubPrefillLabel = null,
  fundraisingHubReturnSlug = null,
  fundraisingHubDefaultTrainingFund = false,
}: SpartanDonateFormProps) {
  const searchParams = useSearchParams()
  const fromQuery =
    searchParams.get("classic") === "1" ||
    searchParams.get("checkout") === "classic" ||
    searchParams.get("form") === "classic"
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SPARTAN_CLASSIC_CHECKOUT === "1"
  /** Classic form doesn’t send `fundraisingHub` — would wrongly send donors to `/spartan` thanks/cancel after Stripe. */
  const useClassicCheckout = !fundraisingHub && (fromQuery || fromEnv)
  if (useClassicCheckout) {
    return (
      <>
        <p className="mb-3 rounded border border-amber-800/50 bg-amber-950/40 px-3 py-2 text-[12px] leading-snug text-amber-100/90">
          <strong className="text-amber-50">Classic checkout</strong> — you’re on the one-page form. For the new step-by-step
          experience, open{" "}
          <a
            className="font-medium text-[#C8A94A] underline underline-offset-2"
            href="/spartan#spartan-checkout"
          >
            /spartan
          </a>{" "}
          without <code className="text-amber-200/80">?classic=1</code>.
        </p>
        <SpartanDonateFormClassic />
      </>
    )
  }
  return (
    <SpartanDonateFormWizard
      fundraisingHub={fundraisingHub}
      fundraisingHubPrefillCode={fundraisingHubPrefillCode}
      fundraisingHubPrefillLabel={fundraisingHubPrefillLabel}
      fundraisingHubReturnSlug={fundraisingHubReturnSlug}
      fundraisingHubDefaultTrainingFund={fundraisingHubDefaultTrainingFund}
    />
  )
}
