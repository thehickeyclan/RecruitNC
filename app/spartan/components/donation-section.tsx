import { Suspense } from "react"
import { NCU_EIN } from "../data"
import { SpartanDonateForm } from "./spartan-donate-form"

function DonateFallback() {
  return <p className="mt-8 text-center text-sm text-[#666]">Loading…</p>
}

export function DonationSection() {
  return (
    <section id="donate" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#1A1A1A] py-14 md:py-16">
      <div className="mx-auto max-w-lg px-4 text-center">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          Register or donate
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#999]">
          <strong className="text-[#ccc]">Race</strong> — running the Spartan (you or a friend); credit one athlete.
          <br />
          <strong className="text-[#ccc]">Donate</strong> — gift only; then athlete or NC United general.
          <br />
          <span className="text-[#777]">$100+ includes a free NC United tee (on the form).</span>
        </p>
        <p className="mt-2 text-xs text-[#555]">
          <a href="#sponsor" className="text-[#C8A94A] hover:underline">
            No race — support someone
          </a>
        </p>

        <Suspense fallback={<DonateFallback />}>
          <SpartanDonateForm />
        </Suspense>

        <p className="mt-8 text-xs text-[#555]">
          501(c)(3) · EIN {NCU_EIN} ·{" "}
          <a href="mailto:contact@ncunitedwrestling.com" className="text-[#C8A94A] hover:underline">
            help
          </a>
        </p>
      </div>
    </section>
  )
}
