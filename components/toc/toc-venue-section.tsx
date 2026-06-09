import Image from "next/image"
import { ExternalLink, GraduationCap, Layers, Lightbulb, MapPin, Trophy, Users } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"
import { TOC_VENUE, TOC_VENUE_FEATURES } from "@/lib/toc/constants"
import type { TocEventConfig } from "@/lib/toc/event-config"

const FEATURE_ICONS = [Layers, GraduationCap, Users, Lightbulb, Trophy] as const

type Props = {
  config: TocEventConfig
}

export function TocVenueSection({ config }: Props) {
  const venueName = config.venue_name ?? TOC_VENUE.name
  const venueAddress = config.venue_address ?? TOC_VENUE.address

  return (
    <section id="venue" className="relative py-16 md:py-20 bg-[#f4f5f7] border-y border-[#0B1D3A]/10">
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto px-4 max-w-6xl pt-4">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative overflow-hidden rounded-sm border-2 border-[#0B1D3A]/10 shadow-xl">
            <Image
              src="/images/toc/venue-apex-arena.png"
              alt="NC United Tournament of Champions venue — two mats, professional lighting, and crowd seating in Apex"
              width={1536}
              height={1024}
              className="h-auto w-full"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>

          <div>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">The venue</p>
            <TocVarsityHeading as="h2" className="text-4xl md:text-5xl mb-4">
              Built like a show
            </TocVarsityHeading>
            <p className="text-[#0B1D3A]/90 text-lg leading-relaxed mb-6">
              {venueName} · {TOC_VENUE.campus} — {TOC_VENUE.seatingLabel}. Two mats all weekend, then one mat
              dedicated for championship finals with full lighting, video boards, and a dedicated section for college
              coaches.
            </p>

            <ul className="space-y-4 mb-8">
              {TOC_VENUE_FEATURES.map(({ title, description }, index) => {
                const Icon = FEATURE_ICONS[index] ?? Layers
                return (
                  <li key={title} className="flex gap-3">
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
        </div>
      </div>
    </section>
  )
}
