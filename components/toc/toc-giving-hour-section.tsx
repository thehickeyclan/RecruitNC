import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Gift, Ticket } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass, tocSectionClass } from "@/components/toc/toc-theme"
import { partnersWithLogos } from "@/lib/partners"

const GIVING_HOUR_PARTNERS = partnersWithLogos("giving-hour")

export function TocGivingHourSection() {
  return (
    <section id="giving-hour" className={`relative scroll-mt-20 bg-[#060f1f] text-white ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute left-0 right-0 top-0" />
      <div className="container mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#D3B574] ${tocDisplayClass()}`}>
            Tournament of Champions
          </p>
          <TocVarsityHeading as="h2" className="mb-4 text-white">
            Introducing the Giving Hour
          </TocVarsityHeading>
          <p className="text-base leading-relaxed text-white/80 sm:text-lg">
            Tournament of Champions sponsors do not pay sponsorship fees to NC United. Instead, partners put their
            commitments directly back into the wrestling community through gear, products, training, services and
            experiences.
          </p>
        </div>

        <div className="mx-auto mb-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-white/15 bg-white/[0.06] p-5 sm:p-6">
            <Ticket className="mb-3 h-7 w-7 text-[#D3B574]" aria-hidden />
            <p className="font-bold text-white">Free raffle tickets for every paid spectator</p>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              One hour before the Finals, every paid spectator will receive free raffle tickets at the door and can
              place them into designated partner boxes for the items or experiences they most want to win.
            </p>
          </div>
          <div className="rounded-sm border border-white/15 bg-white/[0.06] p-5 sm:p-6">
            <Gift className="mb-3 h-7 w-7 text-[#D3B574]" aria-hidden />
            <p className="font-bold text-white">No purchase, auction or bidding</p>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              There is no additional purchase required. The Giving Hour is partner support delivered directly back to
              the wrestling community.
            </p>
          </div>
        </div>

        <p className={`mb-5 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#D3B574] ${tocDisplayClass()}`}>
          Supporting partners
        </p>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {GIVING_HOUR_PARTNERS.map((partner) => {
            const card = (
              <>
                <div className="relative aspect-square w-full">
                  <Image
                    src={partner.logoSrc}
                    alt={`${partner.name} logo`}
                    fill
                    className="object-contain p-5 transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 text-center font-semibold text-[#0B1D3A]">
                  <span>{partner.name}</span>
                  {partner.href ? <ExternalLink className="h-4 w-4 text-[#CC0000]" aria-hidden /> : null}
                </div>
              </>
            )

            return (
              <li key={partner.name}>
                {partner.href ? (
                  <a
                    href={partner.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col overflow-hidden rounded-sm border border-white/15 bg-black no-underline transition-colors hover:border-[#D3B574]/70"
                    aria-label={`Visit ${partner.name}`}
                  >
                    {card}
                  </a>
                ) : (
                  <div className="group flex h-full flex-col overflow-hidden rounded-sm border border-white/15 bg-black">
                    {card}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <p className={`mt-8 text-center text-lg text-white ${tocDisplayClass()}`}>
          All free. All going back to the wrestling community.
        </p>

        {/* The tournament shows the partners funding this weekend; /supporters thanks everyone
            who gives to North Carolina wrestling, and is still there after the mats come up. */}
        <p className="mt-6 text-center">
          <Link
            href="/supporters"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#D3B574] underline-offset-4 hover:underline"
          >
            Everyone supporting NC wrestling
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  )
}
