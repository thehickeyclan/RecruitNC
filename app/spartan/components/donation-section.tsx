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
          Race or give
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#999]">
          <span className="block text-[#bbb]">
            <strong className="text-[#C8A94A]">Team NC</strong> — 10K team race · Sunday, May 3 · Fayetteville.
          </span>
          <span className="mt-2 block">
          <strong className="text-[#ccc]">Race with us</strong> — Super 10K with Team NC (you or a friend); search to
          credit one athlete.
            <br />
            <strong className="text-[#ccc]">Give</strong> — gift only; then <strong className="text-[#999]">an athlete</strong> or{" "}
            <strong className="text-[#999]">NC United</strong> (general).
            <br />
            <span className="text-[#777]">
              <strong className="text-[#999]">Race with us:</strong> every runner gets an NC United tee (size &amp; ship on
              the form). <strong className="text-[#999]">Give only (no race):</strong> $100+ includes the tee.
            </span>
          </span>
        </p>
        <p className="mt-2 text-xs text-[#555]">
          <a href="#sponsor" className="text-[#C8A94A] hover:underline">
            No race — give to an athlete
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
