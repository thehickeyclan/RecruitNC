import Image from "next/image"
import { ExternalLink, Layers, Lightbulb, MapPin, Trophy, Users } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass, tocSectionClass } from "@/components/toc/toc-theme"
import { TocCollegeCoachSection } from "@/components/toc/toc-college-coach-section"
import { TOC_VENUE, TOC_VENUE_FEATURES, TOC_VENUE_LOUNGES } from "@/lib/toc/constants"
import type { TocEventConfig } from "@/lib/toc/event-config"

const FEATURE_ICONS = [Layers, Users, Lightbulb, Trophy] as const

type Props = {
  config: TocEventConfig
}

export function TocVenueSection({ config }: Props) {
  const venueName = config.venue_name ?? TOC_VENUE.name
  const venueAddress = config.venue_address ?? TOC_VENUE.address

  return (
    <section id="venue" className={`relative bg-[#f4f5f7] border-y border-[#0B1D3A]/10 scroll-mt-20 ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl pt-4">
        <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">The venue</p>
        <TocVarsityHeading as="h2" className="mb-3 sm:mb-4">
          Built for the big stage
        </TocVarsityHeading>
        <p className="text-[#0B1D3A]/90 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
          {venueName} · {TOC_VENUE.campus} — {TOC_VENUE.seatingLabel}. Pro lighting, video boards, and a dedicated
          atrium lounge for credentialed coaches and officials.
        </p>

        <figure className="mb-8 overflow-hidden rounded-sm border-2 border-[#0B1D3A]/15 bg-[#071426] shadow-2xl shadow-[#0B1D3A]/20">
          <Image
            src="/images/toc/tournament-of-champions-venue-arena.png"
            alt="Tournament of Champions event rendering showing two NC United mats inside the Apex venue"
            width={1537}
            height={1023}
            className="h-auto w-full"
            sizes="(min-width: 1024px) 1024px, 100vw"
          />
          <figcaption className="border-t border-white/10 bg-[#071426] px-4 py-3 text-xs leading-relaxed text-white/60 sm:px-5">
            Event rendering: two purpose-built NC United mats, championship presentation, video boards, and seating designed
            around the Tournament of Champions experience.
          </figcaption>
        </figure>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {TOC_VENUE_FEATURES.map(({ title, description }, index) => {
            const Icon = FEATURE_ICONS[index] ?? Layers
            return (
              <li key={title} className="flex gap-3 rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1D3A] text-white">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="font-bold text-[#0B1D3A] text-sm uppercase tracking-wide">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-5 sm:p-6 mb-8">
          <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
            {TOC_VENUE_LOUNGES.eyebrow}
          </p>
          <h3 className={`text-[#0B1D3A] text-lg mb-2 ${tocDisplayClass()}`}>{TOC_VENUE_LOUNGES.headline}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{TOC_VENUE_LOUNGES.lead}</p>
          <div className="rounded-sm border border-[#0B1D3A]/10 bg-[#f8f9fb] p-4 border-l-4 border-l-[#CC0000]">
            <div className="flex items-start gap-2 mb-2">
              <Users className="h-5 w-5 text-[#CC0000] shrink-0 mt-0.5" aria-hidden />
              <p className="font-bold text-[#0B1D3A] text-sm uppercase tracking-wide">{TOC_VENUE_LOUNGES.title}</p>
            </div>
            <p className="text-sm text-[#0B1D3A]/85 leading-relaxed pl-7">{TOC_VENUE_LOUNGES.description}</p>
          </div>
          <TocCollegeCoachSection />
        </div>

        <div className="rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-5">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-[#CC0000] shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold text-[#0B1D3A]">{venueName}</p>
              <p className="text-sm text-muted-foreground mt-1">{venueAddress}</p>
              <p className="text-sm text-muted-foreground">{config.event_dates}</p>
              <a
                href={TOC_VENUE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-[#CC0000] hover:underline"
              >
                Open in Google Maps
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
