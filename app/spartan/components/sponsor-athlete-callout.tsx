/**
 * Fundraiser path: gift-only + optional ?athlete= (same checkout as Just Donate).
 * Plain <a> anchors — no client nav inside Radix here.
 */
export function SponsorAthleteCallout() {
  return (
    <div
      className="mx-auto mt-8 max-w-3xl scroll-mt-4 border-l-4 border-[#C8A94A] bg-[#141414] px-4 py-5 md:px-6"
      id="sponsor"
    >
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]">
        Fundraiser option
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-xl font-extrabold uppercase tracking-tight text-white md:text-2xl">
        Support an athlete
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#b0b0b0]">
        Not running? You can still make a <strong className="text-white">tax-deductible gift to NC United</strong> in
        support of a wrestler. Use their personal link or type their <strong className="text-white">fundraising code</strong>{" "}
        on the form.         On the form: <strong className="text-white">Donate</strong>, then <strong className="text-white">An athlete</strong>{" "}
        — so we know you don&apos;t need a race entry.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href="/spartan?mission=1#donate"
          className="inline-flex min-h-[44px] items-center justify-center bg-[#C8A94A] px-5 font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-[0.1em] text-[#0A0A0A] transition-colors hover:bg-[#b89a3d]"
        >
          Support with a gift
        </a>
        <a
          href="#athletes"
          className="inline-flex min-h-[44px] items-center justify-center border border-[#555] px-5 text-sm font-medium text-[#C8A94A] transition-colors hover:border-[#C8A94A]"
        >
          Athlete share links
        </a>
      </div>
    </div>
  )
}
