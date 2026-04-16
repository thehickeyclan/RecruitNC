export function SpartanSimpleExplainer() {
  return (
    <section className="border-b border-[#2A2A2A] bg-black px-4 py-10 md:py-12">
      <div className="mx-auto max-w-lg text-left md:max-w-2xl">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
          How it works
        </h2>
        <ul className="mt-5 list-none space-y-2.5 text-[15px] leading-relaxed text-neutral-300">
          <li>
            <strong className="text-white">Pick one:</strong> Race · Sponsor an athlete · Donate
          </li>
          <li>
            <strong className="text-white">Enter the athlete&apos;s name at checkout</strong> (racing or sponsoring).
          </li>
          <li>
            <strong className="text-white">That money goes toward their training.</strong>
          </li>
        </ul>
        <p className="mt-4 font-[family-name:var(--font-barlow-spartan)] text-lg font-semibold text-white">That&apos;s it.</p>
        <p className="mt-6 rounded-md border border-[var(--spartan-gold)]/40 bg-[#1a170d]/80 px-4 py-3 text-sm leading-snug text-[#e8dcb8]">
          You do <strong className="text-white">not</strong> need to run a race to support an athlete.
        </p>
      </div>
    </section>
  )
}
