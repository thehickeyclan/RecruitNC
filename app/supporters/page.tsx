import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Gift, Ticket } from "lucide-react"
import { PARTNERS, partnersSupporting } from "@/lib/partners"

/**
 * Everyone supporting North Carolina wrestling, on a page that outlives any one event.
 *
 * The Giving Hour lived only inside the tournament page, which meant the partners funding it had
 * nowhere permanent to be seen — and a sponsor's own reason for saying yes is usually a link they
 * can send to their own people. This is that link, and it is still true in March.
 */

export const metadata: Metadata = {
  title: "Supporters — NC Wrestling United",
  description:
    "The partners funding raffle prizes at the Giving Hour, the Caden Perry Scholarship, and everyone supporting North Carolina wrestling.",
}

function PartnerGrid({ partners }: { partners: readonly (typeof PARTNERS)[number][] }) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {partners.map((partner) => {
        const logo = (
          <span className="flex h-24 w-full items-center justify-center rounded-xl border border-[#1a3a5f] bg-white p-4">
            <Image
              src={partner.logoSrc}
              alt={partner.logoAlt}
              width={220}
              height={90}
              className="max-h-full w-auto object-contain"
            />
          </span>
        )
        return (
          <li key={partner.id}>
            {/* A partner with no site still belongs on the page — they just are not a link. */}
            {partner.href ? (
              <a href={partner.href} target="_blank" rel="noreferrer" className="group block">
                {logo}
                <span className="mt-2 block text-center text-sm font-semibold text-white group-hover:text-[#D3B574]">
                  {partner.name}
                </span>
              </a>
            ) : (
              <div>
                {logo}
                <span className="mt-2 block text-center text-sm font-semibold text-white">{partner.name}</span>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function SupportersPage() {
  const givingHour = partnersSupporting("giving-hour")
  const corporate = partnersSupporting("corporate")

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">NC Wrestling United</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Supporters</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#A8BBD1]">
          North Carolina wrestling is held up by people who put money into it and ask for very
          little back. These are those people.
        </p>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">The Giving Hour</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
            Our tournament partners do not pay sponsorship fees. They put the same money into
            prizes instead, and those prizes go straight to the families in the building.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-5">
              <Ticket className="h-5 w-5 text-[#D3B574]" />
              <p className="mt-3 font-bold">Free raffle tickets for every paid spectator</p>
              <p className="mt-2 text-sm leading-relaxed text-[#A8BBD1]">
                One hour before the finals, every paid spectator receives raffle tickets at the
                door. Nothing extra to buy.
              </p>
            </div>
            <div className="rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-5">
              <Gift className="h-5 w-5 text-[#D3B574]" />
              <p className="mt-3 font-bold">Everything given away is donated</p>
              <p className="mt-2 text-sm leading-relaxed text-[#A8BBD1]">
                Gear, training, and equipment from the partners below — which is why a sponsorship
                here reaches wrestlers rather than a banner.
              </p>
            </div>
          </div>

          <PartnerGrid partners={givingHour} />
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">The Caden Perry Scholarship</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
            Named for a North Carolina wrestler, and awarded on need and character rather than on a
            record. Academic results, win-loss records and rankings are explicitly not selection
            criteria.
          </p>
          <Link
            href="/fundraising/scholarships/caden-perry"
            className="mt-6 inline-block rounded-xl bg-[#D3B574] px-6 py-4 font-bold text-[#0A1628]"
          >
            About the scholarship
          </Link>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Programme partners</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
            Businesses supporting the wider programme through the year, not only at the tournament.
          </p>
          <PartnerGrid partners={corporate} />
        </section>

        <section className="mt-16 rounded-2xl border border-[#D3B574] bg-[#13294B] p-8">
          <h2 className="text-2xl font-bold">Become a partner</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[#A8BBD1]">
            If your business wants its support to reach wrestling families directly, the Giving
            Hour is the simplest way we know to do it.
          </p>
          <Link
            href="/tournament-of-champions#sponsor"
            className="mt-6 inline-block rounded-xl bg-[#D3B574] px-6 py-4 font-bold text-[#0A1628]"
          >
            Talk to us
          </Link>
        </section>
      </div>
    </main>
  )
}
