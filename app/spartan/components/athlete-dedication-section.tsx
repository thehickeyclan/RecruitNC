import { HardLink } from "@/components/hard-link"

/** Attribution: search + select athlete on checkout form (Stripe metadata). Optional ?athlete= bookmark. */
export function AthleteDedicationSection() {
  return (
    <section id="athletes" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#0A0A0A] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Credit a wrestler at checkout
          </h2>
          <p className="mt-4 text-[#999]">
            Gifts are tied to an athlete when you <strong className="text-[#ccc]">search for them by name</strong> on the
            donation form and <strong className="text-[#ccc]">select them</strong> before you pay—whether you&apos;re
            racing or only giving, and whether or not they&apos;re on the Spartan course. No codes to memorize; pick the
            right person from search.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded border border-[#333] bg-[#141414] p-6 text-left">
          <p className="text-sm text-[#bbb]">
            <strong className="text-white">Optional bookmark:</strong> some athletes share a URL with{" "}
            <code className="rounded bg-black px-1.5 py-0.5 text-[#C8A94A]">?athlete=NCU-LASTNAME-26</code> (grad year,
            two digits) so this page opens ready to give—example:{" "}
            <HardLink
              href="/spartan?athlete=NCU-HICKEY-26"
              className="text-[#C8A94A] underline-offset-2 hover:underline"
            >
              /spartan?athlete=NCU-HICKEY-26
            </HardLink>
            . What credits them is still choosing their name in the search when you check out.
          </p>
          <p className="mt-4 text-xs text-[#666]">
            Live leaderboard on this page can come later. NC United can pull totals from Stripe exports grouped by
            athlete attribution — see <strong className="text-[#888]">Admin → Fundraising → Spartan 2026</strong>.
          </p>
        </div>
      </div>
    </section>
  )
}
