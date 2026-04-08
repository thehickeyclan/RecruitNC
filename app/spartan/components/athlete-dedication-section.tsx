import { HardLink } from "@/components/hard-link"

/** Shareable links + search on form; gifts attributed via Stripe metadata (internal IDs). */
export function AthleteDedicationSection() {
  return (
    <section id="athletes" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#0A0A0A] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Shareable athlete links
          </h2>
          <p className="mt-4 text-[#999]">
            Every athlete can share a personal link so gifts count toward them — whether the donor runs a race or only
            gives. On the form, supporters <strong className="text-[#ccc]">search for the athlete by name</strong>{" "}
            (no codes to memorize). Kids who aren&apos;t on the course can still fundraise: share the link so the right
            person is credited when someone checks out.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded border border-[#333] bg-[#141414] p-6 text-left">
          <p className="text-sm text-[#bbb]">
            <strong className="text-white">Shareable link:</strong> add{" "}
            <code className="rounded bg-black px-1.5 py-0.5 text-[#C8A94A]">?athlete=NCU-LASTNAME-26</code> to the
            Spartan page link (grad year as two digits). That pre-associates the gift; donors still use{" "}
            <strong className="text-white">search</strong> on the form to confirm. Example:{" "}
            <HardLink
              href="/spartan?athlete=NCU-HICKEY-26"
              className="text-[#C8A94A] underline-offset-2 hover:underline"
            >
              /spartan?athlete=NCU-HICKEY-26
            </HardLink>
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
