import type { Metadata } from "next"
import { listScholarshipsForHub } from "@/lib/scholarships/public-queries"
import { SimpleGiveForm } from "@/components/giving/simple-give-form"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"

/** The scholarship list is read live so a new fund appears here the moment it is created. */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Give | NC United Wrestling",
  description:
    "Support NC United Wrestling or a named scholarship fund. NC United is a 501(c)(3), EIN 99-3757238.",
}

export default async function FundraisingPortalHomePage() {
  const scholarships = await listScholarshipsForHub()
  const options = scholarships.map((s) => ({ slug: s.slug, name: s.name }))

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#D3B574]">
            NC United Wrestling
          </p>
          <h1 className="text-3xl font-black sm:text-4xl">Make a gift</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Every dollar goes to North Carolina wrestlers — training, travel, gear and the events
            that put them on the map. Choose where you want yours to land.
          </p>
        </header>

        <SimpleGiveForm scholarships={options} />
      </div>
      <FundraisingFooter />
    </div>
  )
}
