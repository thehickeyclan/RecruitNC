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
          Your gift — then your code
        </h2>
        <p className="mt-3 text-sm text-[#888]">
          <a href="#sponsor" className="text-[#C8A94A] underline-offset-2 hover:underline">
            Sponsor an athlete
          </a>{" "}
          (no race) uses the same form — choose your amount; add their link if you have it.
        </p>
        <p className="mt-4 text-[#bbb]">
          Flow with Spartan: <strong className="text-[#ddd]">tax-deductible gift to NC United</strong>. If you select a
          race distance, we share <strong className="text-[#ddd]">donor email</strong> and your distance with Spartan so
          they can send your <strong className="text-[#ddd]">Fayetteville entry code</strong>. Gift-only gifts (no
          distance) stay a donation to NC United — no code unless you also pick a race.
        </p>
        <p className="mt-3 text-sm text-[#888]">
          We <strong className="text-[#aaa]">suggest a gift in line with Spartan&apos;s typical registration</strong> for
          the distance you want — you can adjust. Your receipt is from NC United, not a ticket purchase from Spartan.
        </p>
        <p className="mt-3 text-left text-xs leading-relaxed text-[#666]">
          <strong className="text-[#888]">How NC United tracks this:</strong> each payment in Stripe records whether you
          chose a <strong className="text-[#aaa]">race distance</strong> (entry-code path) or <strong className="text-[#aaa]">gift only</strong>, plus an optional{" "}
          <strong className="text-[#aaa]">fundraising code</strong> for athlete credit. That&apos;s how we separate
          &quot;wants to run&quot; vs &quot;support only&quot; in exports — not who actually starts on race day (Spartan
          holds registration details).
        </p>
        <p className="mt-8 text-xs leading-relaxed text-[#666]">
          Gifts to NC United are tax-deductible to the extent allowed by law. NC United is a 501(c)(3) nonprofit. EIN:{" "}
          {NCU_EIN}.
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
