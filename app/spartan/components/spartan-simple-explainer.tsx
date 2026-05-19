export function SpartanSimpleExplainer() {
  return (
    <section className="border-b border-[#2A2A2A] bg-black px-4 py-10 md:py-12">
      <div className="mx-auto max-w-lg text-left md:max-w-2xl">
        <h2 className="font-[family-name:var(--font-barlow-spartan)] text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
          How it works
        </h2>
        <p className="mt-3 text-[14px] leading-snug text-[#a8a8a8]">
          Most supporters complete this in <strong className="text-neutral-200">under 60 seconds</strong>.
        </p>
        <ul className="mt-5 list-none space-y-2.5 text-[15px] leading-relaxed text-neutral-300">
          <li>
            <strong className="text-white">Race</strong> (Training Fund tagging for a wrestler at checkout when you choose one) or <strong className="text-white">Donate</strong>{" "}
            (Training Fund notation for a wrestler or the NC United Training Fund pool) — short steps, then Stripe.
          </li>
          <li>
            <strong className="text-white">Wrestler name on checkout</strong> — search the directory. <strong className="text-white">Racing</strong>{" "}
            — we need an email (parent is fine) for Spartan to send race codes. Your gift is the charitable contribution to NC United Wrestling (Training Fund-supported program costs) flowing through nonprofit checkout—not the Spartan.com retail checkout.
          </li>
          <li>
            <strong className="text-white">Gifts go to training, travel, and competition — 501(c)(3).</strong>
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
