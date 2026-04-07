import type { SpartanRaceTier } from "../types"

export function RaceTierCard({ tier }: { tier: SpartanRaceTier }) {
  const featured = tier.featured === true

  return (
    <article
      className={`flex flex-col border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(204,0,0,0.12)] ${
        featured ? "ring-2 ring-[#CC0000] ring-offset-2 ring-offset-[#0A0A0A]" : ""
      } `}
      style={{ borderLeftWidth: "4px", borderLeftColor: "#CC0000" }}
    >
      {featured && (
        <span className="mb-3 inline-block w-fit bg-[#CC0000] px-2 py-0.5 font-[family-name:var(--font-barlow-spartan)] text-[10px] font-bold uppercase tracking-wider text-white">
          Team favorite
        </span>
      )}
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[#999]">
        {tier.badge}
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase text-white">{tier.name}</h3>
      <p className="mt-2 text-sm text-[#bbb]">{tier.detail}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-[#666]">{tier.dates}</p>
      <p className="mt-6 font-[family-name:var(--font-barlow-spartan)] text-3xl font-black text-[#CC0000]">{tier.priceLabel}</p>
      <a
        href={tier.registerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#990000]"
      >
        Register
      </a>
    </article>
  )
}
