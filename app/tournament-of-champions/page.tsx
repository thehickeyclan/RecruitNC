import type { Metadata } from "next"
import { TocLandingPage } from "@/components/toc/toc-landing-page"
import { resolveTocConfirmedColleges } from "@/lib/toc/confirmed-colleges"
import { getTocEventConfig } from "@/lib/toc/event-config"
import { TOC_EVENT_LOGO, TOC_SATURDAY_COMPETITION_DATE, TOC_VENUE } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tournament of Champions 2026 | NC United Wrestling",
  description:
    `NC United Tournament of Champions — by invitation only. One weigh-in Friday night (no Saturday weigh-in), first round after, brackets finish ${TOC_SATURDAY_COMPETITION_DATE} in Apex, NC.`,
  openGraph: {
    title: "Tournament of Champions | NC United",
    description:
      "Eleven weights. Eight wrestlers each. College weights. Single-mat championship finals. North Carolina, buckle up.",
    type: "website",
    url: "/tournament-of-champions",
    images: [
      {
        url: TOC_EVENT_LOGO.src,
        width: TOC_EVENT_LOGO.width,
        height: TOC_EVENT_LOGO.height,
        alt: TOC_EVENT_LOGO.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tournament of Champions | NC United",
    description:
      "Eleven weights. Eight wrestlers each. College weights. Single-mat championship finals. North Carolina, buckle up.",
    images: [TOC_EVENT_LOGO.src],
  },
}

export default async function TournamentOfChampionsPage() {
  const config = await getTocEventConfig()
  const confirmedColleges = await resolveTocConfirmedColleges(config.confirmed_colleges)

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
      `Invite-only. One weigh-in Friday night — no Saturday weigh-in. College weights, stacked brackets, single-mat championship finals ${TOC_SATURDAY_COMPETITION_DATE}.`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TocLandingPage config={config} confirmedColleges={confirmedColleges} />
    </>
  )
}
