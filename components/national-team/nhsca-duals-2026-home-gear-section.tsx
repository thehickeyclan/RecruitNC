import { ArrowRight } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { NhscaDuals2026SingletPreview } from "@/components/national-team/nhsca-duals-2026-singlet-preview"

/** Homepage gear strip below NHSCA Duals banner — singlets only (apparel on Payments tab). */
export function NhscaDuals2026HomeGearSection() {
  return (
    <section className="bg-[#002147] border-b border-[#CBAF5D]/25" aria-label="NC United 2026 team gear">
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#CBAF5D]/90">NC United</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white">2026 team singlet</h2>
            <p className="mt-1 text-sm text-white/60">Blue or white — custom name on back</p>
          </div>
          <HardLink
            href="/national-team/hub?tab=payments"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#CBAF5D] px-4 text-sm font-bold text-[#002147] hover:bg-[#D3B574]"
          >
            Order gear
            <ArrowRight className="h-4 w-4" aria-hidden />
          </HardLink>
        </div>
        <NhscaDuals2026SingletPreview compact className="mx-auto w-full max-w-md" />
      </div>
    </section>
  )
}
