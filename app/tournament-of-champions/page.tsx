import type { Metadata } from "next"
import { TocLandingPage } from "@/components/toc/toc-landing-page"
import { resolveTocConfirmedColleges } from "@/lib/toc/confirmed-colleges"
import { getTocEventConfig } from "@/lib/toc/event-config"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tournament of Champions 2026 | NC United Wrestling",
  description:
    "NC United Tournament of Champions — September 4-5, 2026 in Apex, NC. 88 wrestlers, 11 college weight classes, true double-elimination. Who is the best in NC at each weight?",
  openGraph: {
    title: "NC United Tournament of Champions 2026",
    description: "Invite-only college-weight tournament for NC's top high school wrestlers. September 4-5, Apex, NC.",
    type: "website",
  },
}

export default async function TournamentOfChampionsPage() {
  const config = await getTocEventConfig()
  const confirmedColleges = await resolveTocConfirmedColleges(config.confirmed_colleges)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "NC United Tournament of Champions",
    startDate: "2026-09-04",
    endDate: "2026-09-05",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: config.venue_name ?? "Hope Community Church",
      address: config.venue_address ?? "Apex, NC",
    },
    organizer: {
      "@type": "Organization",
      name: "NC United Wrestling",
    },
    description:
      "Invite-only high school wrestling tournament at college weight classes with 88-athlete field and recruiting fair.",
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TocLandingPage config={config} confirmedColleges={confirmedColleges} />
    </>
  )
}
