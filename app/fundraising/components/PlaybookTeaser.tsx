import { HardLink } from "@/components/hard-link"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const BULLETS = [
  "The 5 pillars of the NC United model",
  "Who can give — and how much",
  "Corporate giving and employer matching",
  "The outreach sequence that converts",
  "Typical platform fees (illustration)",
  "Campaign execution models — phonathons, business blitzes, team challenges",
  "The flawed models to avoid",
]

export function PlaybookTeaser() {
  return (
    <section className="border-b border-white/[0.06] bg-[#0F2D5A] px-4 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-3xl text-center sm:text-left">
        <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
          Fundraising guide
        </p>
        <h2 className={`${displayFont("mt-3 text-[clamp(1.65rem,4vw,2.5rem)] font-black uppercase leading-tight tracking-tight text-white")}`}>
          How NC United runs community-backed fundraising
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white">
          The same playbook families used on sprint drives — built on 501(c)(3) infrastructure, thoughtful donor outreach, and
          clear roles athletes can follow year-round.
        </p>
        <p className="mt-6 font-semibold text-white">What&apos;s inside:</p>
        <ul className="mt-3 space-y-2 text-left text-sm leading-relaxed text-white">
          {BULLETS.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-[#C8A94A]" aria-hidden>
                •
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-white/90">
          These bullets are a preview—the full chapters are on the guide page, no account required. NC United staff sign in
          separately for donor CRM and exports.
        </p>
        <HardLink
          href="/fundraising/playbook/guide"
          className={`${displayFont("mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-sm bg-[#CC0000] px-8 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_18px_52px_-12px_rgba(204,0,0,0.55)] hover:bg-[#a80000] sm:w-auto")}`}
        >
          Open the full guide →
        </HardLink>
        <div className="mt-4 text-center sm:text-left">
          <HardLink
            href="/fundraising/playbook/members"
            className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
          >
            Members playbook (sign in) →
          </HardLink>
          <span className="mt-1 block text-xs text-white/55">
            Same narrative with visit tracking after RecruitNC sign-in.
          </span>
        </div>
        <p className="mt-4 text-center text-xs text-white/85 sm:text-left">
          <strong className="text-white/95">Staff only:</strong> sign in for donor CRM, exports, and dashboards —{" "}
          <HardLink href="/fundraising/playbook" className="text-[#C8A94A] underline-offset-4 hover:underline">
            RecruitNC staff sign-in
          </HardLink>
          <span className="text-white/55"> (not the reading guide).</span>
        </p>
      </div>
    </section>
  )
}
