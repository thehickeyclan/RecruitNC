"use client"

import { Suspense, useEffect } from "react"
import { SpartanDonateForm } from "@/app/spartan/components/spartan-donate-form"

const CHECKOUT_ANCHOR_ID = "spartan-checkout"

function FundraisingAthleteCheckoutHashScroll() {
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

type Props = {
  /** NCU code — checkout only embedded when present */
  athleteCode: string | null
  /** Directory label for Stripe + progress recap */
  athleteDirectoryLabel: string
  /** URL slug for Stripe thanks/cancel */
  fundraisingSlug: string
}

function FormFallback() {
  return <p className="py-10 text-center text-sm text-white/50">Loading checkout…</p>
}

export function FundraisingAthleteEmbeddedCheckout({ athleteCode, athleteDirectoryLabel, fundraisingSlug }: Props) {
  if (!athleteCode?.trim()) {
    return (
      <p className="text-center text-sm text-white/60">
        This page isn&apos;t open for gifts yet — go to{" "}
        <a href="/fundraising/give" className="font-medium text-[#C8A94A] underline underline-offset-2">
          Make a gift
        </a>{" "}
        to find an athlete or support the training fund.
      </p>
    )
  }

  return (
    <Suspense fallback={<FormFallback />}>
      <FundraisingAthleteCheckoutHashScroll />
      <SpartanDonateForm
        fundraisingHub
        fundraisingHubPrefillCode={athleteCode.trim().toUpperCase()}
        fundraisingHubPrefillLabel={athleteDirectoryLabel.trim()}
        fundraisingHubReturnSlug={fundraisingSlug.trim().toLowerCase()}
      />
    </Suspense>
  )
}
