import type { Metadata } from "next"
import { TocLandingPage } from "@/components/toc/toc-landing-page"
import { getTocEventConfig } from "@/lib/toc/event-config"
import { TOC_SATURDAY_COMPETITION_DATE, TOC_VENUE } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tournament of Champions 2026 | NC United Wrestling",
  description:
    `NC United Tournament of Champions — by invitation only. Weigh-in and first round Friday night, brackets finish ${TOC_SATURDAY_COMPETITION_DATE} in Apex, NC.`,
  openGraph: {
    title: "Tournament of Champions | NC United",
    description:
      "Eleven weights. Eight wrestlers each. College weights. Single-mat finals under the lights. North Carolina, buckle up.",
    type: "website",
  },
}

export default async function TournamentOfChampionsPage() {
  const config = await getTocEventConfig()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "NC United Tournament of Champions",
    startDate: "2026-09-18",
    endDate: "2026-09-19",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: config.venue_name ?? "Hope Community Church",
      address: config.venue_address ?? TOC_VENUE.address,
    },
    organizer: {
      "@type": "Organization",
      name: "NC United Wrestling",
    },
    description:
      `Invite-only. College weights, stacked brackets — first round Friday night, finals under the lights ${TOC_SATURDAY_COMPETITION_DATE}.`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TocLandingPage config={config} />
    </>
  )
}
