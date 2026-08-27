import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Gift, Ticket } from "lucide-react"
import { partnersSupporting, partnersWithLogos, type Partner } from "@/lib/partners"

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
    "Thank you to the families, small businesses and companies giving back to North Carolina wrestling — the Giving Hour partners, the Caden Perry Scholarship, and everyone supporting our community.",
}

function PartnerGrid({ partners }: { partners: readonly (Partner & { logoSrc: string })[] }) {
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
  const givingHour = partnersWithLogos("giving-hour")
  // Supporters of the Giving Hour we have no logo file for. Without this they were on the list
  // and off the page — the grid only renders what it can show.
  const givingHourNamed = partnersSupporting("giving-hour").filter((p) => !p.logoSrc)
  const corporate = partnersWithLogos("corporate")
  const inKind = partnersSupporting("in-kind")
  const majorGifts = partnersSupporting("major-gift")

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">NC Wrestling United</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Thank you</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#A8BBD1]">
          A family buying mats. A restaurant down the road sending lunch. A national grocer
          sending gift cards. None of them had to, and none of them asked for anything back — they
          did it because they want wrestling in this state to be better for somebody else&apos;s
          kid. This page is where we say so, and where we keep saying it.
        </p>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">The Giving Hour</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
            These partners could have bought a banner. They chose to buy prizes instead, and every
            one of those prizes goes to a family sitting in the stands. We are grateful they took
            us up on it — it is a harder kind of generosity, because nobody sees their name on the
            wall for it.
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
              <p className="mt-3 font-bold">Every prize is donated</p>
              <p className="mt-2 text-sm leading-relaxed text-[#A8BBD1]">
                Gear, training and equipment, given by the partners below and handed to our
                wrestling community through a free raffle. Nothing is sold, and nothing is held
                back.
              </p>
            </div>
          </div>

          <PartnerGrid partners={givingHour} />

          {givingHourNamed.length > 0 ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {givingHourNamed.map((p) => (
                <li key={p.id} className="rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-5">
                  {p.href ? (
                    <a href={p.href} target="_blank" rel="noreferrer" className="font-bold text-white hover:text-[#D3B574]">
                      {p.name}
                    </a>
                  ) : (
                    <span className="font-bold text-white">{p.name}</span>
                  )}
                  {p.gift ? <p className="mt-1 text-sm leading-relaxed text-[#A8BBD1]">{p.gift}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {majorGifts.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-2xl font-bold">Gifts we will not forget</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
              Given by people who simply decided our wrestlers should have better than we could
              afford on our own.
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              {majorGifts.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-2xl border border-[#D3B574] bg-[#13294B]">
                  {p.photoSrc ? (
                    <Image
                      src={p.photoSrc}
                      alt={p.photoAlt ?? p.gift ?? p.name}
                      width={1200}
                      height={600}
                      className="h-56 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-6">
                    <p className="text-xl font-bold">{p.name}</p>
                    <p className="mt-2 leading-relaxed text-[#A8BBD1]">{p.gift}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {inKind.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-2xl font-bold">Given, not bought</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
              Small businesses and national names alike, sending food, supplies and drink to an
              event they had nothing to gain from. Every item here is a cost we did not carry, and
              every dollar it saved goes straight back into our wrestling community.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {inKind.map((p) => (
                <li key={p.id} className="flex items-start gap-4 rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-5">
                  {p.logoSrc ? (
                    <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-white p-2">
                      <Image
                        src={p.logoSrc}
                        alt={p.logoAlt}
                        width={120}
                        height={56}
                        className="max-h-full w-auto object-contain"
                      />
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    {p.href ? (
                      <a href={p.href} target="_blank" rel="noreferrer" className="font-bold text-white hover:text-[#D3B574]">
                        {p.name}
                      </a>
                    ) : (
                      <span className="font-bold text-white">{p.name}</span>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-[#A8BBD1]">{p.gift}</p>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-16">
          <h2 className="text-2xl font-bold">The Caden Perry Scholarship</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#A8BBD1]">
            Named for a North Carolina wrestler, and awarded on need and character rather than on a
            record. Academic results, win-loss records and rankings are explicitly not selection
            criteria. The fund stands at <strong className="text-white">$1,300</strong> — $1,000
            from NC United, and $300 given by the Padgett family, who simply wanted a North
            Carolina wrestler to have it.
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
            Businesses who back North Carolina wrestling all year, not only on the weekend when
            there is a crowd to see them do it.
          </p>
          <PartnerGrid partners={corporate} />
        </section>

        <section className="mt-16 rounded-2xl border border-[#D3B574] bg-[#13294B] p-8">
          <h2 className="text-2xl font-bold">Become a partner</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[#A8BBD1]">
            Every name on this page started with somebody deciding to help. If you would like to
            join them, the Giving Hour is the most direct way we know to put what you give into a
            wrestling family&apos;s hands.
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
