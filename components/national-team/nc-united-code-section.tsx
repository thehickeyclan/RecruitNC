import { NC_UNITED_CODE, NC_UNITED_CODE_ANCHOR } from "@/lib/nc-united-code"

export function NcUnitedCodeSection() {
  return (
    <section id={NC_UNITED_CODE_ANCHOR} className="py-16 md:py-20 bg-white scroll-mt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10 md:mb-12">
          <span className="text-[#CBAF5D] text-base md:text-lg font-semibold tracking-wide uppercase mb-3 block">
            National Team standards
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-3">{NC_UNITED_CODE.title}</h2>
          <p className="text-xl md:text-2xl font-semibold text-[#002147]/90">{NC_UNITED_CODE.tagline}</p>
          <p className="mt-3 text-base md:text-lg text-gray-600 max-w-2xl mx-auto">{NC_UNITED_CODE.intro}</p>
        </div>

        <ol className="space-y-4 md:space-y-5">
          {NC_UNITED_CODE.principles.map(({ number, title, body }) => (
            <li
              key={number}
              className="rounded-xl border border-[#002147]/10 bg-gray-50/80 px-4 py-4 md:px-5 md:py-5"
            >
              <p className="font-bold text-[#002147]">
                {number}. {title}
              </p>
              <p className="mt-1.5 text-sm md:text-base text-gray-700 leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 md:mt-12 rounded-xl border-2 border-[#002147]/15 bg-[#002147] text-white px-5 py-6 md:px-8 md:py-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#CBAF5D] mb-3">
            {NC_UNITED_CODE.closingHeading}
          </p>
          <div className="space-y-1 text-base md:text-lg font-medium">
            {NC_UNITED_CODE.closingLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-6 text-xl md:text-2xl font-black text-[#CBAF5D] tracking-wide">{NC_UNITED_CODE.motto}</p>
        </div>
      </div>
    </section>
  )
}
