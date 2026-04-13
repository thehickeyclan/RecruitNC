import Image from "next/image"
import { Suspense } from "react"
import { HardLink } from "@/components/hard-link"
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
          Race or give
        </h2>
        <p className="mx-auto mt-4 max-w-md rounded border border-[#333] bg-[#141414] px-3 py-3 text-left text-[13px] leading-snug text-[#ccc] sm:text-sm">
          <span className="block font-medium text-[#8ab4d8]">Donor</span>
          <span className="text-[#aaa]">Your name &amp; email — whoever is paying (often a parent).</span>
          <span className="mt-2 block font-medium text-[#C8A94A]">Wrestler</span>
          <span className="text-[#aaa]">Chosen in the search on the form — who gets fundraising credit.</span>
        </p>
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
        <p className="mt-3">
          <HardLink
            href="/spartan?mission=1#spartan-checkout"
            className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-[#C8A94A] underline-offset-2 hover:underline"
          >
            No race — donate (NC United or a wrestler)
          </HardLink>
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
