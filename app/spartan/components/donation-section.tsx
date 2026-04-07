import { Suspense } from "react"
import { NCU_EIN } from "../data"
import { SpartanDonateForm } from "./spartan-donate-form"

function DonateFallback() {
  return (
    <p className="mt-10 text-center text-sm text-[#666]">Loading donation form…</p>
  )
}

export function DonationSection() {
  return (
    <section id="donate" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#1A1A1A] py-16 md:py-20">
      <div className="mx-auto max-w-xl px-4 text-center">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase text-white">
          Donate — then get your code
        </h2>
        <p className="mt-4 text-[#bbb]">
          This is the path we&apos;re running with Spartan: <strong className="text-[#ddd]">donate to NC United</strong>, we{" "}
          <strong className="text-[#ddd]">compile donor emails</strong> (and your preferred distance if you choose), and{" "}
          <strong className="text-[#ddd]">Spartan emails your Fayetteville entry code</strong>.
        </p>
        <p className="mt-3 text-sm text-[#888]">
          Race reference pricing below is from Spartan — your gift is to NC United; the code is fulfilled by Spartan.
        </p>
        <p className="mt-8 text-xs leading-relaxed text-[#666]">
          Donations to NC United are tax-deductible. NC United is a registered 501(c)(3) nonprofit. EIN: {NCU_EIN}.
        </p>

        <Suspense fallback={<DonateFallback />}>
          <SpartanDonateForm />
        </Suspense>

        <p className="mt-10 text-xs text-[#555]">
          Need help?{" "}
          <a href="mailto:contact@ncunitedwrestling.com" className="text-[#C8A94A] hover:underline">
            contact@ncunitedwrestling.com
          </a>
        </p>
      </div>
    </section>
  )
}
