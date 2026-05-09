"use client"

import { Suspense, useEffect } from "react"
import { SpartanDonateForm } from "@/app/spartan/components/spartan-donate-form"

const CHECKOUT_ANCHOR_ID = "spartan-checkout"

/** Reserved hub slug for Stripe thanks/cancel URLs (not an athlete directory slug). */
export const FUNDRAISING_TRAINING_FUND_RETURN_SLUG = "training-fund"

function TrainingFundHashScroll() {
  useEffect(() => {
    const scrollToCheckout = () => {
      const raw = window.location.hash.slice(1)
      if (raw !== CHECKOUT_ANCHOR_ID && raw !== "donate" && raw !== "give-checkout") return
      const el = document.getElementById(CHECKOUT_ANCHOR_ID)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    scrollToCheckout()
    const t1 = window.setTimeout(scrollToCheckout, 100)
    const t2 = window.setTimeout(scrollToCheckout, 400)
    window.addEventListener("hashchange", scrollToCheckout)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener("hashchange", scrollToCheckout)
    }
  }, [])
  return null
}

function FormFallback() {
  return <p className="py-10 text-center text-sm text-white/50">Loading checkout…</p>
}

export function FundraisingTrainingFundCheckout() {
  return (
    <>
      <TrainingFundHashScroll />
      <section className="mx-auto max-w-lg px-4 pb-16 pt-2">
        <div
          id={CHECKOUT_ANCHOR_ID}
          className="scroll-mt-28 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/35 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6"
        >
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-center text-lg font-bold uppercase tracking-wide text-white">
            Secure checkout
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-[13px] leading-snug text-white/70">
            <strong className="font-semibold text-white/85">NC United Training Fund</strong> — tax-deductible gifts ($5
            minimum) that support training, travel, and national competition year-round. You&apos;ll finish on Stripe; your
            501(c)(3) receipt arrives by email.
          </p>
          <div className="mt-6 w-full text-left">
            <Suspense fallback={<FormFallback />}>
              <SpartanDonateForm
                fundraisingHub
                fundraisingHubDefaultTrainingFund
                fundraisingHubReturnSlug={FUNDRAISING_TRAINING_FUND_RETURN_SLUG}
              />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  )
}
