import type { Metadata } from "next"
import { Suspense } from "react"
import { TocRegistrationPayFlow } from "@/components/toc/register/toc-registration-pay-flow"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import {
  formatTocRegistrationFee,
  registrationPaymentDueDisplay,
  TOC_REGISTRATION_FEE_COVERS,
} from "@/lib/toc/registration-policy"

export const metadata: Metadata = {
  title: "Pay Registration | Tournament of Champions 2026",
  description: "Confirmed athletes — pay your Tournament of Champions registration fee securely.",
  robots: { index: false, follow: false },
}

export default function TocRegistrationPayPage() {
  return (
    <>
      <section className="bg-[#0B1D3A] text-white">
        <TocPatrioticBar />
        <div className="container mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 max-w-3xl">
          <p className="text-[#CC0000] text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold mb-3">
            Confirmed athletes only
          </p>
          <TocVarsityHeading as="h1" className="text-white text-4xl sm:text-5xl md:text-6xl mb-3">
            Pay registration
          </TocVarsityHeading>
          <p className={`text-white/80 text-lg max-w-2xl ${tocDisplayClass()}`}>
            {formatTocRegistrationFee()} due by {registrationPaymentDueDisplay()}. Look up your RecruitNC profile and
            complete secure checkout.
          </p>
          <p className="mt-3 text-white/55 text-sm max-w-2xl">
            Payment supports tournament entry, {TOC_REGISTRATION_FEE_COVERS}. Checkout is tagged{" "}
            <strong className="text-white/75">TOC Reg</strong> in Stripe for NC United reporting.
          </p>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto w-full px-4 sm:px-6 max-w-2xl">
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading payment form…</p>}>
            <TocRegistrationPayFlow />
          </Suspense>
        </div>
      </section>
    </>
  )
}
