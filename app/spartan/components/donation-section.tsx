import Image from "next/image"
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
        <div className="mx-auto mt-5 w-full max-w-[240px]">
          <div className="relative aspect-square overflow-hidden rounded border border-[#333] bg-[#0a0a0a]">
            <Image
              src="/images/spartan-nc-united-tee.png"
              alt="2026 Fayetteville team tee: black shirt, NC mark and Spartan helmet on front; back reads Strength in Unity, Fayetteville May 2026"
              fill
              sizes="240px"
              className="object-contain object-center"
            />
          </div>
          <p className="mt-2 text-center text-[10px] text-[#666]">Artwork may vary; while supplies last.</p>
        </div>
        <p className="mx-auto mt-5 max-w-md text-sm text-[#999]">
          <span className="block text-[#bbb]">
            <strong className="text-[#C8A94A]">Team NC</strong> — 10K team race · Sunday, May 3 · Fayetteville.
          </span>
          <span className="mt-2 block">
          <strong className="text-[#ccc]">Race with us</strong> — Super 10K with Team NC (you or a friend); search to
          credit one wrestler.
            <br />
            <strong className="text-[#ccc]">Give</strong> — gift only; then <strong className="text-[#999]">a wrestler</strong> or{" "}
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
            No race — donate (NC United or a wrestler)
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
