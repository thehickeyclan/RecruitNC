import { HardLink } from "@/components/hard-link"

/**
 * Sharper contrast: informal peer apps vs nonprofit checkout + ledger-backed flows.
 */
export function PlaybookInformalGivingNote() {
  return (
    <section
      className="mt-12 rounded-xl border border-[#C8A94A]/35 bg-[#1a1510]/90 px-4 py-6 sm:px-6 sm:py-8"
      role="note"
      aria-labelledby="playbook-informal-giving-heading"
    >
      <h2
        id="playbook-informal-giving-heading"
        className="font-[family-name:var(--font-fundraising-display)] text-base font-bold uppercase leading-snug tracking-wide text-[#C8A94A] sm:text-lg"
      >
        Informal apps (Venmo, Cash App, GoFundMe) vs NC United checkout
      </h2>
      <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-white/85 sm:text-[15px]">
        Lots of families start with Venmo, Cash App, or a viral social link — it feels fast because it mirrors asking a friend for cash. For
        wrestling-season fundraising credited through NC United, that spontaneity trades away deductions, employer matching, corporate gifts, and
        foundation-grade paperwork donors may already qualify for — the nonprofit checkout is built for those lanes.
      </p>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-white/82 sm:text-[15px]">
        A credibility lift beats dozens of households independently begging on whatever link looks trendy this week. NC United routes the same circle of
        supporters through receipts, attribution, and transparency that holds up for schools, employers, and the IRS when donors expect their gifts to be
        charitable — not just convenient peer transfers.
      </p>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-white/80 sm:text-[15px]">
        NC United is a registered 501(c)(3). Athlete profiles and links take about ten minutes to stand up; staff can help if you get stuck.
      </p>
      <div className="mt-6">
        <HardLink
          href="/fundraising/athletes"
          className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-sm border border-[#C8A94A]/60 bg-[#C8A94A]/15 px-6 font-[family-name:var(--font-fundraising-display)] text-xs font-extrabold uppercase tracking-[0.12em] text-[#C8A94A] transition hover:bg-[#C8A94A]/25 sm:text-sm"
        >
          Open athlete fundraising profiles →
        </HardLink>
      </div>
    </section>
  )
}
