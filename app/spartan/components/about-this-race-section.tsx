/** Venue / course copy from Spartan’s Fayetteville event page — link out for tickets & heat times. */
export function AboutThisRaceSection() {
  return (
    <section className="border-t border-b border-[#2A2A2A] bg-[#111] py-14 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C8A94A]">
          About this race
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          McCormick Farms · Fayetteville
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-[#b8b8b8] md:text-base">
          Don&apos;t underestimate McCormick Farms in Fayetteville – a staff favorite Spartan venue renowned for its
          challenging obstacle course racing. With over 1000 acres of demanding terrain, including dense forests, a
          200-foot deep quarry, and steep riverbanks, this course will test your technical skills and demand you embrace
          the challenge. <strong className="text-[#ccc]">Team NC is here for the Super 10K</strong> — Spartan lists other
          distances the same weekend if you browse their full schedule.
        </p>
        <p className="mt-6">
          <a
            href="https://www.spartan.com/en/races/fayetteville-north-carolina?index=0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#CC0000] underline-offset-4 transition-colors hover:text-[#ff4444] hover:underline"
          >
            Full event details on Spartan.com
            <span aria-hidden className="text-[#888]">
              ↗
            </span>
          </a>
        </p>
      </div>
    </section>
  )
}
