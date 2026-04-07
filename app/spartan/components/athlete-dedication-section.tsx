import { HardLink } from "@/components/hard-link"

/** Placeholder for roster search + leaderboard until Supabase stats are wired. */
export function AthleteDedicationSection() {
  return (
    <section id="athletes" className="scroll-mt-4 border-t border-[#2A2A2A] bg-[#0A0A0A] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Run for a wrestler
          </h2>
          <p className="mt-4 text-[#999]">
            Dedicate your gift to a specific NC United athlete. Share your personal link so friends and family run in their
            name — every registration tied to their code counts toward recognition.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded border border-[#333] bg-[#141414] p-6 text-left">
          <p className="text-sm text-[#bbb]">
            <strong className="text-white">Shareable link:</strong> add{" "}
            <code className="rounded bg-black px-1.5 py-0.5 text-[#C8A94A]">?athlete=NCU-LASTNAME-26</code> to this page
            URL (grad year as two digits). Example:{" "}
            <HardLink
              href="/spartan?athlete=NCU-HICKEY-26"
              className="text-[#C8A94A] underline-offset-2 hover:underline"
            >
              recruitnc.com/spartan?athlete=NCU-HICKEY-26
            </HardLink>
          </p>
          <p className="mt-4 text-xs text-[#666]">
            Athlete search and live leaderboard will appear here as registrations roll in. For now, use the donation form
            below — your athlete code from the URL is saved with your gift.
          </p>
        </div>
      </div>
    </section>
  )
}
