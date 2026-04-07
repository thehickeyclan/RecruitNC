import Image from "next/image"

export function AboutSection() {
  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:gap-16 md:items-start">
        <div>
          <p className="font-[family-name:var(--font-barlow-spartan)] text-xs font-semibold uppercase tracking-[0.2em] text-[#CC0000]">
            The mission
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-barlow-spartan)] text-3xl font-bold uppercase leading-tight tracking-tight text-white md:text-4xl">
            Wrestling builds warriors. We build wrestlers.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[#bbb]">
            NC United is a 501(c)(3) nonprofit developing North Carolina&apos;s top high school wrestlers. Every dollar
            raised sends athletes to elite summer competitions and training.
          </p>
          <div className="relative mt-10 h-12 w-44 opacity-90">
            <Image
              src="/images/nc-united-logo-white.png"
              alt="NC United"
              fill
              className="object-contain object-left"
            />
          </div>
        </div>
        <div>
          <blockquote className="border-l-4 border-[#CC0000] bg-[#1A1A1A] py-6 pl-6 pr-4">
            <p className="text-lg leading-relaxed text-white md:text-xl">
              &ldquo;All the entries are on us. You can sell tickets and keep the money.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-[#999]">
              — Joe De Sena, CEO, Spartan Race
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  )
}
