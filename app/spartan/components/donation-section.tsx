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
          Checkout
        </h2>
        <p className="mx-auto mt-3 max-w-md text-left text-[13px] leading-snug text-[#aaa] sm:text-sm">
          One secure form. <strong className="text-[#e5e5e5]">Your name</strong> = who pays.{" "}
          <strong className="text-[#C8A94A]">Wrestler search</strong> = who gets credit (racing &amp; sponsoring).
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
        <p className="mx-auto mt-5 max-w-md text-sm text-[#888]">
          Team tee: included for race signups; $100+ gifts without a race also qualify (while supplies last). Size and ship on
          the form.
        </p>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          <HardLink
            href="/spartan?mission=1&mode=athlete#spartan-checkout"
            className="inline-flex min-h-[44px] items-center justify-center font-medium text-[#C8A94A] underline-offset-2 hover:underline"
          >
            Skip to sponsoring
          </HardLink>
          <HardLink
            href="/spartan?mission=1&mode=fund#spartan-checkout"
            className="inline-flex min-h-[44px] items-center justify-center font-medium text-[#8ab4d8] underline-offset-2 hover:underline"
          >
            Skip to training fund
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
