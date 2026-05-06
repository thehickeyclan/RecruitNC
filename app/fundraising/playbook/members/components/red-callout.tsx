import { HardLink } from "@/components/hard-link"

export function PlaybookMembersRedCallout() {
  return (
    <section
      className="border-b border-black/20 px-4 py-10 text-white sm:py-12"
      style={{ backgroundColor: "#CC0000" }}
      aria-labelledby="playbook-red-callout-heading"
    >
      <div className="mx-auto max-w-3xl text-center sm:text-left">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
          Before you post
        </p>
        <h2
          id="playbook-red-callout-heading"
          className="font-[family-name:var(--font-fundraising-display)] mt-4 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl"
        >
          Before you post that Venmo link
        </h2>
        <p className="mt-5 text-base font-medium leading-relaxed text-white/95 sm:text-lg">
          If you are raising money for your athlete through Venmo, Cash App, GoFundMe, or informal social posts — pause here first.
          Donors often miss tax benefits they could claim when eligible, and paths like employer matching usually require a 501(c)(3).
        </p>
        <p className="mt-4 text-base leading-relaxed text-white/90">
          NC United has a nonprofit checkout built for wrestlers: receipts, attribution, and transparency. Getting oriented takes minutes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 sm:justify-start">
          <HardLink
            href="/fundraising/athletes"
            className="inline-flex min-h-[52px] items-center justify-center rounded-sm bg-white px-8 font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-[0.14em] text-[#CC0000] shadow-lg transition hover:bg-white/90"
          >
            Get set up now →
          </HardLink>
        </div>
      </div>
    </section>
  )
}
