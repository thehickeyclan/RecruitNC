import type { Metadata } from "next"
import Image from "next/image"
import {
  Calendar,
  ClipboardList,
  ExternalLink,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Shirt,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  AAU_SCHOLASTIC_AT_VENUE,
  AAU_SCHOLASTIC_DIVISION_NOTES,
  AAU_SCHOLASTIC_DUALS_2026,
  AAU_SCHOLASTIC_DUALS_SCHEDULE,
  AAU_SCHOLASTIC_ELIGIBILITY,
  AAU_SCHOLASTIC_EXTRA_ALTERNATE_RULES,
  AAU_SCHOLASTIC_OFFICIAL_LINKS,
  AAU_SCHOLASTIC_OPERATIONS,
  AAU_SCHOLASTIC_PARENT_FAQ,
  AAU_SCHOLASTIC_TEAM_HOTEL,
  AAU_SCHOLASTIC_TOURNAMENT_CONTACT,
  AAU_SCHOLASTIC_WEIGHT_RULES,
  AAU_SCHOLASTIC_WEIGHTS_DISPLAY,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS,
  formatAauScholasticDollars,
} from "@/lib/aau-scholastic-duals-2026-content"
import { AauScholasticPricingTable } from "@/components/national-team/aau-scholastic-pricing-table"
import { AauScholasticRosterTable } from "@/components/national-team/aau-scholastic-roster-table"
import { AauScholasticYourPaymentSection } from "@/components/national-team/aau-scholastic-your-payment-section"
import { NcUnitedCodeCallout } from "@/components/national-team/nc-united-code-callout"
import { AAU_SCHOLASTIC_DUALS_2026_ROSTER } from "@/lib/aau-scholastic-duals-2026-roster"
import {
  ScholasticDualsSection,
  scholasticCalloutClass,
  scholasticInsetClass,
  scholasticLinkClass,
} from "@/components/national-team/scholastic-duals-section"
import {
  aauHeroGradientClass,
  aauLabelClass,
  aauMainClass,
  aauNavPillClass,
  aauPageClass,
  aauPrimaryBtnClass,
  aauSecondaryBtnClass,
  aauStepBadgeClass,
  aauAccentHeaderClass,
} from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "AAU Scholastic Duals 2026 — NC United | Info & Registration",
  description:
    "NC United operations guide for AAU Scholastic Duals 2026 Boys All-Star — dates, venue, weights, roster, eligibility, pricing, and registration.",
}

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#operations", label: "Operations" },
  { href: "#roster", label: "Roster" },
  { href: "#schedule", label: "Schedule" },
  { href: "#venue", label: "Venue & hotel" },
  { href: "#aau-official", label: "AAU rules" },
  { href: "#weights", label: "Weights" },
  { href: "#cost", label: "Cost" },
  { href: "#your-payment", label: "Your payment" },
  { href: "#expectations", label: "Expectations" },
  { href: "#register", label: "Register" },
  { href: "#faq", label: "FAQ" },
] as const

function OpsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-3 border-b border-white/10 last:border-0">
      <dt className={cn("text-sm font-semibold sm:w-40 shrink-0", aauLabelClass)}>{label}</dt>
      <dd className="text-sm text-white/80 flex-1">{value}</dd>
    </div>
  )
}

export default function ScholasticDuals2026Page() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${AAU_SCHOLASTIC_DUALS_2026.mapsQuery}`
  const hotelMapsUrl = `https://www.google.com/maps/search/?api=1&query=${AAU_SCHOLASTIC_TEAM_HOTEL.mapsQuery}`

  return (
    <div className={aauPageClass}>
      <header className="relative bg-[#002147] text-white overflow-hidden border-b border-[#B31B1B]/30">
        <div className={aauHeroGradientClass} />
        <div className="relative container mx-auto px-4 py-12 md:py-16 max-w-5xl">
          <a
            href="/national-team"
            className="inline-flex items-center min-h-[44px] text-sm text-white/70 hover:text-white mb-6 transition-colors"
          >
            ← NC United National Team
          </a>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <Badge className="bg-[#B31B1B] text-white mb-4 border-0">{AAU_SCHOLASTIC_DUALS_2026.datesLabel}</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-3">
                {AAU_SCHOLASTIC_DUALS_2026.shortTitle}
              </h1>
              <p className="text-lg text-white/85 mb-2">{AAU_SCHOLASTIC_OPERATIONS.eventName}</p>
              <p className="text-white/70 text-sm md:text-base max-w-xl">
                NC United operations Q&amp;A for parents and families — everything you need before you register.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href={AAU_SCHOLASTIC_DUALS_2026.registerPath} className={aauPrimaryBtnClass}>
                  Register &amp; checkout
                </a>
                <a href={AAU_SCHOLASTIC_DUALS_2026.hubPath} className={aauSecondaryBtnClass}>
                  Team Hub (registered families)
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-white rounded-xl p-3 shadow-lg">
                <Image
                  src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/RvVmX1xykzrPFQWr6nfUZ-AAU.jpeg"
                  alt="AAU"
                  width={72}
                  height={72}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="hidden sm:block w-px h-16 bg-white/20" />
              <div className="text-sm text-white/80 max-w-[220px]">
                <p className="font-semibold text-white">NC United Wrestling</p>
                <p className="mt-1">{AAU_SCHOLASTIC_OPERATIONS.division}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav
        aria-label="Page sections"
        className="sticky top-0 z-30 border-b border-[#B31B1B]/25 bg-[#001428]/95 backdrop-blur-md"
      >
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex gap-2 overflow-x-auto py-2.5 snap-x snap-mandatory scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map(({ href, label }) => (
              <a key={href} href={href} className={aauNavPillClass}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className={aauMainClass}>
        <ScholasticDualsSection
          id="overview"
          title="Overview for families"
          icon={<Users className="h-5 w-5 text-[#B31B1B]" />}
          description={AAU_SCHOLASTIC_OPERATIONS.division}
          contentClassName="space-y-4"
        >
          <p>
            NC United competes in the <strong className="text-white">{AAU_SCHOLASTIC_OPERATIONS.eventName}</strong> at
            the Broward County Convention Center in Fort Lauderdale. Approximately{" "}
            <strong className="text-white">40–50 elite teams</strong> nationally compete in this premier scholastic duals
            event.
          </p>
          <p>
            Standard roster: <strong className="text-white">{AAU_SCHOLASTIC_OPERATIONS.rosterStarters} starters</strong>
            , <strong className="text-white">{AAU_SCHOLASTIC_OPERATIONS.rosterAlternates} alternates</strong> (
            {AAU_SCHOLASTIC_OPERATIONS.rosterStandardTotal} athletes). Extra alternates may be allowed (
            {formatAauScholasticDollars(AAU_SCHOLASTIC_OPERATIONS.extraAlternateFeeDollars)} each) — confirm with staff.
          </p>
          <p className="text-sm pt-2 border-t border-white/10">
            Official tournament info:{" "}
            <a
              href={AAU_SCHOLASTIC_DUALS_2026.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={scholasticLinkClass}
            >
              aausports.org/wrestling/scholastic-duals
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="operations"
          title="NC United – Operations Q&A"
          description="Quick reference from NC United staff"
          headerClassName={aauAccentHeaderClass}
          contentClassName="pt-2"
        >
          <dl>
            <OpsRow label="Event" value={AAU_SCHOLASTIC_OPERATIONS.eventName} />
            <OpsRow label="Division" value={AAU_SCHOLASTIC_OPERATIONS.division} />
            <OpsRow label="Arrival / weigh-ins" value={AAU_SCHOLASTIC_OPERATIONS.arrivalWeighIns} />
            <OpsRow label="Competition" value={AAU_SCHOLASTIC_OPERATIONS.competitionDates} />
            <OpsRow label="Departure" value={AAU_SCHOLASTIC_OPERATIONS.departure} />
            <OpsRow
              label="Venue"
              value={`${AAU_SCHOLASTIC_OPERATIONS.venueName}, ${AAU_SCHOLASTIC_OPERATIONS.venueAddress1}, ${AAU_SCHOLASTIC_OPERATIONS.venueCityStateZip}`}
            />
            <OpsRow
              label="Team hotel"
              value={`${AAU_SCHOLASTIC_OPERATIONS.hotelName}, ${AAU_SCHOLASTIC_OPERATIONS.hotelAddress1}, ${AAU_SCHOLASTIC_OPERATIONS.hotelCityStateZip}`}
            />
            <OpsRow
              label="Roster"
              value={`${AAU_SCHOLASTIC_OPERATIONS.rosterCoaches} coaches · ${AAU_SCHOLASTIC_OPERATIONS.rosterStarters} wrestlers · ${AAU_SCHOLASTIC_OPERATIONS.rosterAlternates} alternates · ${AAU_SCHOLASTIC_OPERATIONS.rosterTableWorkers} table worker · EXT +$${AAU_SCHOLASTIC_OPERATIONS.extraAlternateFeeDollars}`}
            />
            <OpsRow label="AAU team entry deadline" value={AAU_SCHOLASTIC_OPERATIONS.teamEntryDeadline} />
          </dl>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="roster"
          title="Team roster"
          icon={<Users className="h-5 w-5 text-[#B31B1B]" />}
          description={`${AAU_SCHOLASTIC_OPERATIONS.rosterStarters} starters · weight shown with +5 lb allowance`}
          contentClassName="px-0 pb-0"
        >
          <AauScholasticRosterTable rows={AAU_SCHOLASTIC_DUALS_2026_ROSTER} className="mx-5 mb-5 md:mx-6 md:mb-6" />
          <p className="text-xs text-white/45 px-5 pb-5 md:px-6">
            No 175 or HWT starter at this time — alternates and any changes will be posted in the Team Hub.
          </p>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="schedule"
          title="Dates & schedule"
          icon={<Calendar className="h-5 w-5 text-[#B31B1B]" />}
          description={AAU_SCHOLASTIC_DUALS_2026.travelNote}
        >
          <ul className="space-y-4">
            {AAU_SCHOLASTIC_DUALS_SCHEDULE.map(({ day, detail }) => (
              <li
                key={day}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-white/10 pb-4 last:border-0 last:pb-0"
              >
                <span className="font-semibold text-white">{day}</span>
                <span className="text-white/65 sm:text-right">{detail}</span>
              </li>
            ))}
          </ul>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="venue"
          title="Venue, hotel & travel"
          icon={<MapPin className="h-5 w-5 text-[#B31B1B]" />}
          contentClassName="space-y-6"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FF7070]">Competition venue</p>
            <p>
              <strong className="text-white">{AAU_SCHOLASTIC_DUALS_2026.venue}</strong>
              <br />
              {AAU_SCHOLASTIC_DUALS_2026.venueAddress}
            </p>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={scholasticLinkClass}>
              Open venue in Google Maps
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className={scholasticInsetClass + " space-y-4"}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FF7070] mb-2">NC United team hotel</p>
              <p className="font-semibold text-white text-base">{AAU_SCHOLASTIC_TEAM_HOTEL.name}</p>
              <p className="mt-1 text-sm text-white/70">
                {AAU_SCHOLASTIC_TEAM_HOTEL.googleRating.toFixed(1)} ·{" "}
                {AAU_SCHOLASTIC_TEAM_HOTEL.googleReviewCount.toLocaleString()} Google reviews ·{" "}
                {AAU_SCHOLASTIC_TEAM_HOTEL.starsLabel}
              </p>
              <p className="mt-2 text-white/80">
                {AAU_SCHOLASTIC_TEAM_HOTEL.addressLine1}
                <br />
                {AAU_SCHOLASTIC_TEAM_HOTEL.cityStateZip}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <a
                  href={AAU_SCHOLASTIC_TEAM_HOTEL.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={scholasticLinkClass}
                >
                  {AAU_SCHOLASTIC_TEAM_HOTEL.websiteLabel}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a href={`tel:${AAU_SCHOLASTIC_TEAM_HOTEL.phoneTel}`} className={scholasticLinkClass}>
                  {AAU_SCHOLASTIC_TEAM_HOTEL.phone}
                </a>
                <a href={hotelMapsUrl} target="_blank" rel="noopener noreferrer" className={scholasticLinkClass}>
                  Google Maps
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {AAU_SCHOLASTIC_TEAM_HOTEL.photos.map((photo) => (
                <div
                  key={photo.src}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#001428]"
                >
                  <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                </div>
              ))}
            </div>
            <p className="text-sm text-white/65">
              Hotel and van transport are selectable at registration checkout. Room block and van details are coordinated
              through NC United after you register.
            </p>
          </div>

          <p className={scholasticCalloutClass}>
            <strong>Parking:</strong> $25/day at the convention center.{" "}
            <strong>Flights:</strong> selectable at registration checkout — Team Hub has travel updates after payment.
          </p>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="aau-official"
          title="AAU official info (entry packet)"
          description="From the 2026 Scholastic Duals entry packet — District All-Star division"
          contentClassName="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {AAU_SCHOLASTIC_AT_VENUE.map(({ title, body }) => (
              <div key={title} className={scholasticInsetClass}>
                <p className="font-semibold text-white mb-1">{title}</p>
                <p className="leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
          <div className={scholasticInsetClass}>
            <p className="font-semibold text-white mb-2">Extra alternates (EXT)</p>
            <ul className="list-disc pl-5 space-y-1 text-white/70">
              {AAU_SCHOLASTIC_EXTRA_ALTERNATE_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-white/65">
            {AAU_SCHOLASTIC_DIVISION_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
            <a href={AAU_SCHOLASTIC_OFFICIAL_LINKS.scholasticDuals} target="_blank" rel="noopener noreferrer" className={scholasticLinkClass}>
              AAU Scholastic Duals
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={AAU_SCHOLASTIC_OFFICIAL_LINKS.aauMembership} target="_blank" rel="noopener noreferrer" className={scholasticLinkClass}>
              AAU membership
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={AAU_SCHOLASTIC_OFFICIAL_LINKS.teamList} target="_blank" rel="noopener noreferrer" className={scholasticLinkClass}>
              Registered teams (aauwrestling.net)
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-xs text-white/45">
            AAU tournament director:{" "}
            <a href={`tel:${AAU_SCHOLASTIC_TOURNAMENT_CONTACT.phoneTel}`} className={scholasticLinkClass}>
              {AAU_SCHOLASTIC_TOURNAMENT_CONTACT.name} · {AAU_SCHOLASTIC_TOURNAMENT_CONTACT.phone}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${AAU_SCHOLASTIC_TOURNAMENT_CONTACT.email}`} className={scholasticLinkClass}>
              {AAU_SCHOLASTIC_TOURNAMENT_CONTACT.email}
            </a>
          </p>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="weights"
          title="Weight classes & rules"
          icon={<Scale className="h-5 w-5 text-[#B31B1B]" />}
          description={AAU_SCHOLASTIC_OPERATIONS.division}
          contentClassName="space-y-4"
        >
          <p className="font-medium tracking-wide text-white">{AAU_SCHOLASTIC_WEIGHTS_DISPLAY}</p>
          <div className={scholasticInsetClass + " space-y-2"}>
            <p className="font-semibold text-white">Weight rules</p>
            <ul className="list-disc pl-5 space-y-1 text-white/65">
              {AAU_SCHOLASTIC_WEIGHT_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/60">
            Select the weight class your athlete is wrestling for NC United during registration.
          </p>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          title="Eligibility"
          icon={<ShieldCheck className="h-5 w-5 text-[#B31B1B]" />}
        >
          <ul className="space-y-2">
            {AAU_SCHOLASTIC_ELIGIBILITY.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#B31B1B] font-bold shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="cost"
          title="Cost & what's included"
          icon={<Shirt className="h-5 w-5 text-[#B31B1B]" />}
          headerClassName={aauAccentHeaderClass}
          contentClassName="space-y-4 text-sm md:text-base"
        >
          <p>
            At registration, check each item you want — registration, apparel, hotel/van, and flight. Most families
            select the full bundle ({formatAauScholasticDollars(AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS)} at
            checkout). Plan about{" "}
            <strong className="text-white">
              {formatAauScholasticDollars(AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS)} all-in
            </strong>{" "}
            per athlete before meals and local ground transport.
          </p>
          <AauScholasticPricingTable />
        </ScholasticDualsSection>

        <AauScholasticYourPaymentSection />

        <ScholasticDualsSection
          id="expectations"
          title="NC United expectations"
          description="Every national-team athlete represents North Carolina"
          contentClassName="space-y-4"
        >
          <NcUnitedCodeCallout variant="dark" />
        </ScholasticDualsSection>

        <ScholasticDualsSection
          id="register"
          title="Registration"
          icon={<ClipboardList className="h-5 w-5 text-[#B31B1B]" />}
          description="Select items and pay online — no invite code needed"
          headerClassName={aauAccentHeaderClass}
          contentClassName="space-y-6"
        >
          <ol className="space-y-4">
            {[
              "Open the registration link below.",
              "Complete athlete & parent/guardian information.",
              "Check each item you want (registration, apparel, hotel/van, flight).",
              "Pay securely at Stripe checkout — receipt emailed automatically.",
              "After payment, go to the Team Hub for gear sizes, travel, and updates.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className={aauStepBadgeClass}>{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={AAU_SCHOLASTIC_DUALS_2026.registerPath}
            className={cn(aauPrimaryBtnClass, "flex w-full min-h-[52px]")}
          >
            Start registration →
          </a>
          <p className="text-xs text-white/45 text-center">
            Questions? Contact {AAU_SCHOLASTIC_DUALS_2026.contactName} at{" "}
            <a href={`tel:${AAU_SCHOLASTIC_DUALS_2026.contactPhoneTel}`} className={scholasticLinkClass}>
              {AAU_SCHOLASTIC_DUALS_2026.contactPhone}
            </a>{" "}
            or{" "}
            <a href={`mailto:${AAU_SCHOLASTIC_DUALS_2026.contactEmail}`} className={scholasticLinkClass}>
              {AAU_SCHOLASTIC_DUALS_2026.contactEmail}
            </a>
            .
          </p>
        </ScholasticDualsSection>

        <ScholasticDualsSection id="faq" title="FAQ for parents" contentClassName="space-y-6">
          {AAU_SCHOLASTIC_PARENT_FAQ.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-white mb-1">{q}</h3>
              <p className="text-white/75 leading-relaxed">{a}</p>
            </div>
          ))}
        </ScholasticDualsSection>

        <ScholasticDualsSection title="Contact" icon={<Phone className="h-5 w-5 text-[#B31B1B]" />} contentClassName="space-y-2">
          <p>
            <strong className="text-white">{AAU_SCHOLASTIC_DUALS_2026.contactName}</strong> — NC United National Team
          </p>
          <p>
            <a href={`tel:${AAU_SCHOLASTIC_DUALS_2026.contactPhoneTel}`} className={scholasticLinkClass}>
              {AAU_SCHOLASTIC_DUALS_2026.contactPhone}
            </a>
          </p>
          <p>
            <a href={`mailto:${AAU_SCHOLASTIC_DUALS_2026.contactEmail}`} className={scholasticLinkClass}>
              {AAU_SCHOLASTIC_DUALS_2026.contactEmail}
            </a>
          </p>
        </ScholasticDualsSection>
      </main>
    </div>
  )
}
