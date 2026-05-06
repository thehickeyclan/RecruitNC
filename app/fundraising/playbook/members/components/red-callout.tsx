import { HardLink } from "@/components/hard-link"

/**
 * Full-bleed orientation strip — Venmo warning + setup CTA (matches playbook doc).
 */
export function PlaybookMembersRedCallout() {
  return (
    <div
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-10 w-screen max-w-[100vw] border-y border-black/25 bg-[#CC0000] text-white"
      role="note"
      aria-labelledby="playbook-red-callout-heading"
    >
      <div className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
        <h2
          id="playbook-red-callout-heading"
          className="font-[family-name:var(--font-fundraising-display)] text-lg font-black uppercase leading-snug tracking-tight text-white sm:text-xl"
        >
          <span className="mr-2 inline-block" aria-hidden>
            ⚠️
          </span>
          Before you post that Venmo link
        </h2>
        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-white/92 sm:text-[15px]">
          If you are raising money for your athlete through Venmo, Cash App, GoFundMe, or personal social media posts — stop and read this first.
        </p>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-white/92 sm:text-[15px]">
          You are leaving real money on the table. Your donors are not getting the tax benefit they deserve. And serious donors — the ones who give
          $250 or more — will hesitate without a formal receipt.
        </p>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-white/85 sm:text-[15px]">
          NC United is a registered 501(c)(3). Everything you need is already built. It takes 10 minutes to get set up.
        </p>
        <div className="mt-7">
          <HardLink
            href="/fundraising/athletes"
            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-sm border-2 border-white/90 bg-white px-6 font-[family-name:var(--font-fundraising-display)] text-xs font-extrabold uppercase tracking-[0.12em] text-[#CC0000] transition hover:bg-white/90 sm:text-sm"
          >
            Get set up now →
          </HardLink>
        </div>
      </div>
    </div>
  )
}
