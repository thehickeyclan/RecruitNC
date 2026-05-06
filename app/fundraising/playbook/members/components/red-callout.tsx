import { HardLink } from "@/components/hard-link"

/** Compact Venmo warning — not a full-bleed hero strip */
export function PlaybookMembersRedCallout() {
  return (
    <aside
      className="rounded-xl border border-[#CC0000]/40 bg-[#CC0000]/[0.13] py-5 pl-5 pr-5 shadow-[inset_4px_0_0_0_#CC0000]"
      aria-labelledby="playbook-red-callout-heading"
    >
      <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-black uppercase tracking-[0.22em] text-[#ffb4b4]">
        Before you post
      </p>
      <h2
        id="playbook-red-callout-heading"
        className="font-[family-name:var(--font-fundraising-display)] mt-2 text-lg font-black uppercase leading-snug tracking-tight text-white sm:text-xl"
      >
        Before you post that Venmo link
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-white/88">
        Raising through Venmo, Cash App, GoFundMe, or informal posts often leaves donor tax benefits and employer matching on the table — those
        paths usually need a 501(c)(3).
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/75">
        NC United checkout gives receipts, athlete attribution, and a nonprofit ledger — then credits and reimbursements flow through{" "}
        <strong className="text-white">Profile → Digital wallet</strong>, not a personal Venmo balance. Orientation takes minutes.
      </p>
      <div className="mt-5">
        <HardLink
          href="/fundraising/athletes"
          className="inline-flex min-h-10 items-center justify-center rounded-sm bg-[#CC0000] px-5 font-[family-name:var(--font-fundraising-display)] text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#a80000]"
        >
          Get set up now →
        </HardLink>
      </div>
    </aside>
  )
}
