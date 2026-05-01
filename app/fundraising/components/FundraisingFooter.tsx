import Image from "next/image"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function FundraisingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#020812] px-4 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <Image
          src="/images/nc-united-stacked-logo-white.png"
          alt="NC United Wrestling"
          width={180}
          height={72}
          className="h-14 w-auto opacity-95"
        />
        <div className="max-w-xl space-y-3 text-sm leading-relaxed text-white/60">
          <p className={`${displayFont("text-[12px] font-extrabold uppercase tracking-[0.14em] text-white/90")}`}>
            NC United Wrestling is a registered 501(c)(3) nonprofit.
          </p>
          <p>
            EIN: <span className="tabular-nums text-white/85">99-3757238</span>. All donations are fully tax-deductible
            to the extent allowed by law.
          </p>
          <p>
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
            >
              info@ncwrestlingunited.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
