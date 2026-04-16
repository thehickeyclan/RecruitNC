import { Suspense } from "react"
import { NCU_EIN } from "../data"
import { SpartanDonateForm } from "./spartan-donate-form"
import { SpartanHashScroll } from "./spartan-hash-scroll"

function DonateFallback() {
  return <p className="mt-8 text-center text-sm text-[#666]">Loading…</p>
}

export function DonationSection() {
  return (
    <section className="border-t border-[#2A2A2A] bg-[#1A1A1A] py-14 md:py-16">
      <SpartanHashScroll />
      <div className="mx-auto max-w-lg px-4 pb-1 text-center sm:px-4">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          Checkout
        </h2>
        <p className="mx-auto mt-3 max-w-md text-left text-[13px] leading-snug text-[#aaa] sm:text-sm">
          One secure form. <strong className="text-[#e5e5e5]">Your name</strong> = who pays.{" "}
          <strong className="text-[#C8A94A]">Wrestler search</strong> = who gets credit (racing &amp; sponsoring).
        </p>

        <div id="spartan-checkout" className="scroll-mt-28 mt-8 w-full text-left">
          <Suspense fallback={<DonateFallback />}>
            <SpartanDonateForm />
          </Suspense>
        </div>

        <p className="mt-8 text-xs text-[#555]">
          501(c)(3) · EIN {NCU_EIN} ·{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            help
          </a>
        </p>
      </div>
    </section>
  )
}
