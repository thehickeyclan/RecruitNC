import { BedDouble, Clock3, ExternalLink, MapPin } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_HOTELS, TOC_VENUE } from "@/lib/toc/constants"

function BookingLink({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="inline-flex min-h-9 items-center rounded-sm bg-[#0B1D3A]/8 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#0B1D3A]/55">
        Coming soon
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 items-center gap-1 rounded-sm bg-[#CC0000] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#a80000]"
    >
      Book room
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  )
}

export function TocHotelsSection() {
  return (
    <section id="hotels" className={`relative scroll-mt-20 bg-white text-[#0B1D3A] ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute left-0 right-0 top-0" />
      <div className="container mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#CC0000]">Plan your stay</p>
        <TocVarsityHeading as="h2" className="mb-3">
          Tournament Hotels
        </TocVarsityHeading>
        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-[#0B1D3A]/70 sm:text-base">
          Several nearby hotels are offering special Tournament of Champions rates for athletes and families. All properties
          below are approximately two miles from the venue. Booking links will be added as they become available.
        </p>
        <p className="mb-8 inline-flex items-start gap-2 text-sm font-medium text-[#0B1D3A]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#CC0000]" aria-hidden />
          Venue: {TOC_VENUE.name} — {TOC_VENUE.address}
        </p>

        <div className="space-y-4 md:hidden">
          {TOC_HOTELS.map((hotel) => (
            <article key={hotel.name} className="rounded-sm border-2 border-[#0B1D3A]/10 bg-[#f8f9fb] p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1D3A] text-white">
                  <BedDouble className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold leading-snug">{hotel.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#0B1D3A]/60">
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> {hotel.distance} from Hope Church
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-y border-[#0B1D3A]/10 py-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#0B1D3A]/50">TOC rate</dt>
                  <dd className="mt-1 font-bold">{hotel.rate}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#0B1D3A]/50">Block / deadline</dt>
                  <dd className="mt-1 font-semibold leading-snug">{hotel.blockDeadline}</dd>
                </div>
              </dl>
              <p className="my-3 text-sm leading-relaxed text-[#0B1D3A]/70">{hotel.notes}</p>
              <BookingLink url={hotel.bookingUrl} />
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-sm border-2 border-[#0B1D3A]/10 md:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b-2 border-[#CC0000] bg-[#0B1D3A] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="w-[21%] px-4 py-3">Hotel</th>
                <th className="w-[12%] px-4 py-3">Distance</th>
                <th className="w-[11%] px-4 py-3">TOC rate</th>
                <th className="w-[19%] px-4 py-3">Block / deadline</th>
                <th className="w-[14%] px-4 py-3">Booking</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B1D3A]/10">
              {TOC_HOTELS.map((hotel) => (
                <tr key={hotel.name} className="align-top odd:bg-white even:bg-[#f8f9fb]">
                  <td className="px-4 py-4 font-bold leading-snug">{hotel.name}</td>
                  <td className="px-4 py-4 font-semibold">{hotel.distance}</td>
                  <td className="px-4 py-4 font-bold">{hotel.rate}</td>
                  <td className="px-4 py-4 leading-relaxed">{hotel.blockDeadline}</td>
                  <td className="px-4 py-4"><BookingLink url={hotel.bookingUrl} /></td>
                  <td className="px-4 py-4 text-xs leading-relaxed text-[#0B1D3A]/70">{hotel.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-sm border-l-4 border-[#CC0000] bg-[#f4f5f7] p-4 text-sm text-[#0B1D3A]/70">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#CC0000]" aria-hidden />
          <p>Rates and availability are subject to hotel inventory. Families are responsible for booking directly with the hotel.</p>
        </div>
      </div>
    </section>
  )
}
