import Image from "next/image"

export function PartnersFooter() {
  return (
    <footer className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
          <div className="relative h-10 w-36">
            <Image src="/images/nc-united-logo-white.png" alt="NC United" fill className="object-contain" />
          </div>
          <span className="font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold text-[#CC0000]" aria-hidden>
            ×
          </span>
          <div className="font-[family-name:var(--font-barlow-spartan)] text-xl font-black uppercase tracking-wide text-white">
            Spartan Race
          </div>
        </div>
        <p className="text-sm text-[#666]">
          Questions?{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
        <p className="text-xs text-[#555]">
          <a href="/" className="hover:text-[#999]">
            ← NC United / RecruitNC home
          </a>
        </p>
      </div>
    </footer>
  )
}
