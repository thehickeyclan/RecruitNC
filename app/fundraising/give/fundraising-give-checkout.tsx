"use client"

import { Suspense, useEffect } from "react"
import { SpartanDonateForm } from "@/app/spartan/components/spartan-donate-form"

/**
 * Same id as `donation-section` on `/spartan` so `scrollToCheckout()` inside the wizard still works.
 */
const CHECKOUT_ANCHOR_ID = "spartan-checkout"

function FundraisingGiveHashScroll() {
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

export function FundraisingGiveCheckout() {
  return (
    <>
      <FundraisingGiveHashScroll />
      <section className="mx-auto max-w-lg px-4 pb-16 pt-2">
        <div
          id={CHECKOUT_ANCHOR_ID}
          className="scroll-mt-28 rounded-xl border border-white/10 bg-[#1A1A1A] p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] sm:p-6"
        >
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-center text-lg font-bold uppercase tracking-wide text-white">
            Checkout
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-[13px] leading-snug text-[#aaa]">
            Pick <strong className="text-[#e5e5e5]">Donate</strong> for a simple gift (credit a wrestler or the NC United training fund) or{" "}
            <strong className="text-[#e5e5e5]">Race</strong> if you&apos;re registering for the event. Stripe at the end.
          </p>
          <div className="mt-6 w-full text-left">
            <Suspense fallback={<FormFallback />}>
              <SpartanDonateForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  )
}
