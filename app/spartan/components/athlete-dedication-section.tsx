import { HardLink } from "@/components/hard-link"

/** Explains search-based credit + optional ?athlete= pre-fill (Stripe metadata still set at checkout). */
export function AthleteDedicationSection() {
  return (
    <section id="athletes" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#0A0A0A] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Credit a wrestler at checkout
          </h2>
          <p className="mt-4 text-[#999]">
            Gifts are tied to a wrestler when you <strong className="text-[#ccc]">search for them by name</strong> on the
            donation form and <strong className="text-[#ccc]">select them</strong> before you pay—whether you&apos;re
            racing or only giving, and whether or not they&apos;re on the Spartan course. No codes to memorize; pick the
            right person from search.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded border border-[#333] bg-[#141414] p-6 text-left">
          <p className="text-sm text-[#bbb]">
            <strong className="text-white">Shareable link:</strong> wrestlers can send a URL like{" "}
            <HardLink
              href="/spartan?athlete=NCU-HICKEY-29"
              className="text-[#C8A94A] underline-offset-2 hover:underline"
            >
              /spartan?athlete=NCU-HICKEY-29
            </HardLink>{" "}
            (<code className="rounded bg-black px-1.5 py-0.5 text-[#C8A94A]">?athlete=NCU-LASTNAME-YY</code>
            —YY is grad year). It pre-fills the form; the gift only counts toward them after you{" "}
            <strong className="text-[#ccc]">select their name in search</strong> and complete checkout.
          </p>
        </div>
      </div>
    </section>
  )
}
