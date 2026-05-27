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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  AAU_SCHOLASTIC_TOURNAMENT_CONTACT,
  AAU_SCHOLASTIC_WEIGHT_RULES,
  AAU_SCHOLASTIC_WEIGHTS_DISPLAY,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  formatAauScholasticDollars,
} from "@/lib/aau-scholastic-duals-2026-content"
import { AauScholasticPricingTable } from "@/components/national-team/aau-scholastic-pricing-table"
import { AauScholasticRosterTable } from "@/components/national-team/aau-scholastic-roster-table"
import { AAU_SCHOLASTIC_DUALS_2026_ROSTER } from "@/lib/aau-scholastic-duals-2026-roster"

export const metadata: Metadata = {
  title: "AAU Scholastic Duals 2026 — NC United | Info & Registration",
  description:
    "NC United operations guide for AAU Scholastic Duals 2026 Boys All-Star — dates, venue, weights, roster, eligibility, pricing, and invite-only registration.",
}

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#operations", label: "Operations" },
  { href: "#roster", label: "Roster" },
  { href: "#schedule", label: "Schedule" },
  { href: "#venue", label: "Venue" },
  { href: "#aau-official", label: "AAU rules" },
  { href: "#weights", label: "Weights" },
  { href: "#cost", label: "Cost" },
  { href: "#register", label: "Register" },
  { href: "#faq", label: "FAQ" },
] as const

function OpsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-semibold text-[#002147] sm:w-40 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-700 flex-1">{value}</dd>
    </div>
  )
}

export default function ScholasticDuals2026Page() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${AAU_SCHOLASTIC_DUALS_2026.mapsQuery}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative bg-[#002147] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#002147] via-[#003366] to-[#B31B1B]/40 opacity-90" />
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <a
            href="/national-team"
            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-6 transition-colors"
          >
            ← NC United National Team
          </a>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <Badge className="bg-[#B31B1B] text-white mb-4">{AAU_SCHOLASTIC_DUALS_2026.datesLabel}</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-3">
                {AAU_SCHOLASTIC_DUALS_2026.shortTitle}
              </h1>
              <p className="text-lg text-white/85 mb-2">{AAU_SCHOLASTIC_OPERATIONS.eventName}</p>
              <p className="text-white/70 text-sm md:text-base max-w-xl">
                NC United operations Q&amp;A for parents and families — everything you need before you register.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href={AAU_SCHOLASTIC_DUALS_2026.registerPath}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#CBAF5D] px-6 py-3 text-base font-bold text-[#002147] hover:bg-[#d4bc7a] transition-colors"
                >
                  Register (invite code required)
                </a>
                <a
                  href={AAU_SCHOLASTIC_DUALS_2026.hubPath}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/15 transition-colors"
                >
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

      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container mx-auto px-4 overflow-x-auto">
          <ul className="flex gap-1 py-2 min-w-max">
            {NAV.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex min-h-[40px] items-center rounded-lg px-3 py-2 text-sm font-medium text-[#002147] hover:bg-[#002147]/5 transition-colors whitespace-nowrap"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 md:py-14 max-w-4xl space-y-8">
        <Card id="overview" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Users className="h-5 w-5 text-[#B31B1B]" />
              Overview for families
            </CardTitle>
            <CardDescription>{AAU_SCHOLASTIC_OPERATIONS.division}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              NC United competes in the <strong>{AAU_SCHOLASTIC_OPERATIONS.eventName}</strong> at the Broward County
              Convention Center in Fort Lauderdale. Approximately <strong>40–50 elite teams</strong> nationally compete in
              this premier scholastic duals event.
            </p>
            <p>
              Standard roster: <strong>{AAU_SCHOLASTIC_OPERATIONS.rosterStarters} starters</strong>,{" "}
              <strong>{AAU_SCHOLASTIC_OPERATIONS.rosterAlternates} alternates</strong> (
              {AAU_SCHOLASTIC_OPERATIONS.rosterStandardTotal} athletes). Extra alternates may be allowed (
              {formatAauScholasticDollars(AAU_SCHOLASTIC_OPERATIONS.extraAlternateFeeDollars)} each) — confirm with staff.
            </p>
            <p className="text-sm pt-2 border-t border-gray-100">
              Official tournament info:{" "}
              <a
                href={AAU_SCHOLASTIC_DUALS_2026.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003366] font-medium hover:underline inline-flex items-center gap-1"
              >
                aausports.org/wrestling/scholastic-duals
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card id="operations" className="border-[#B31B1B]/20 shadow-sm scroll-mt-24">
          <CardHeader className="bg-[#B31B1B]/5">
            <CardTitle className="text-[#002147]">NC United – Operations Q&amp;A</CardTitle>
            <CardDescription>Quick reference from NC United staff</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
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
                label="Roster"
                value={`${AAU_SCHOLASTIC_OPERATIONS.rosterCoaches} coaches · ${AAU_SCHOLASTIC_OPERATIONS.rosterStarters} wrestlers · ${AAU_SCHOLASTIC_OPERATIONS.rosterAlternates} alternates · ${AAU_SCHOLASTIC_OPERATIONS.rosterTableWorkers} table worker · EXT +$${AAU_SCHOLASTIC_OPERATIONS.extraAlternateFeeDollars}`}
              />
              <OpsRow label="AAU team entry deadline" value={AAU_SCHOLASTIC_OPERATIONS.teamEntryDeadline} />
            </dl>
          </CardContent>
        </Card>

        <Card id="roster" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Users className="h-5 w-5 text-[#B31B1B]" />
              Team roster
            </CardTitle>
            <CardDescription>
              {AAU_SCHOLASTIC_OPERATIONS.rosterStarters} starters · weight shown with +5 lb allowance
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AauScholasticRosterTable rows={AAU_SCHOLASTIC_DUALS_2026_ROSTER} className="px-5 pb-5 md:px-6 md:pb-6" />
            <p className="text-xs text-gray-500 px-5 pb-5 md:px-6">
              No 175 or HWT starter at this time — alternates and any changes will be posted in the Team Hub.
            </p>
          </CardContent>
        </Card>

        <Card id="schedule" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Calendar className="h-5 w-5 text-[#B31B1B]" />
              Dates & schedule
            </CardTitle>
            <CardDescription>{AAU_SCHOLASTIC_DUALS_2026.travelNote}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {AAU_SCHOLASTIC_DUALS_SCHEDULE.map(({ day, detail }) => (
                <li
                  key={day}
                  className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <span className="font-semibold text-[#002147]">{day}</span>
                  <span className="text-gray-600 sm:text-right">{detail}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card id="venue" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <MapPin className="h-5 w-5 text-[#B31B1B]" />
              Venue & travel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              <strong>{AAU_SCHOLASTIC_DUALS_2026.venue}</strong>
              <br />
              {AAU_SCHOLASTIC_DUALS_2026.venueAddress}
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003366] hover:underline"
            >
              Open venue in Google Maps
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <strong>Parking:</strong> $25/day at the convention center.{" "}
              <strong>Hotel, van &amp; flights:</strong> NC United details in the Team Hub.
            </p>
          </CardContent>
        </Card>

        <Card id="aau-official" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-[#002147]">AAU official info (entry packet)</CardTitle>
            <CardDescription>
              From the 2026 Scholastic Duals entry packet — District All-Star division
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-gray-700">
            <div className="grid gap-4 sm:grid-cols-2">
              {AAU_SCHOLASTIC_AT_VENUE.map(({ title, body }) => (
                <div key={title} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="font-semibold text-[#002147] mb-1">{title}</p>
                  <p className="leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-[#002147]/5 border border-[#002147]/10 px-4 py-3">
              <p className="font-semibold text-[#002147] mb-2">Extra alternates (EXT)</p>
              <ul className="list-disc pl-5 space-y-1">
                {AAU_SCHOLASTIC_EXTRA_ALTERNATE_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              {AAU_SCHOLASTIC_DIVISION_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
              <a
                href={AAU_SCHOLASTIC_OFFICIAL_LINKS.scholasticDuals}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003366] font-medium hover:underline inline-flex items-center gap-1"
              >
                AAU Scholastic Duals
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={AAU_SCHOLASTIC_OFFICIAL_LINKS.aauMembership}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003366] font-medium hover:underline inline-flex items-center gap-1"
              >
                AAU membership
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={AAU_SCHOLASTIC_OFFICIAL_LINKS.teamList}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003366] font-medium hover:underline inline-flex items-center gap-1"
              >
                Registered teams (aauwrestling.net)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs text-gray-500">
              AAU tournament director:{" "}
              <a href={`tel:${AAU_SCHOLASTIC_TOURNAMENT_CONTACT.phoneTel}`} className="text-[#003366] hover:underline">
                {AAU_SCHOLASTIC_TOURNAMENT_CONTACT.name} · {AAU_SCHOLASTIC_TOURNAMENT_CONTACT.phone}
              </a>{" "}
              ·{" "}
              <a href={`mailto:${AAU_SCHOLASTIC_TOURNAMENT_CONTACT.email}`} className="text-[#003366] hover:underline">
                {AAU_SCHOLASTIC_TOURNAMENT_CONTACT.email}
              </a>
            </p>
          </CardContent>
        </Card>

        <Card id="weights" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Scale className="h-5 w-5 text-[#B31B1B]" />
              Weight classes & rules
            </CardTitle>
            <CardDescription>{AAU_SCHOLASTIC_OPERATIONS.division}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p className="font-medium tracking-wide">{AAU_SCHOLASTIC_WEIGHTS_DISPLAY}</p>
            <div className="rounded-lg bg-[#002147]/5 border border-[#002147]/10 px-4 py-3 text-sm space-y-2">
              <p className="font-semibold text-[#002147]">Weight rules</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                {AAU_SCHOLASTIC_WEIGHT_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Select the weight class you agreed to with NC United coaches during registration.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#003366]/15 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <ShieldCheck className="h-5 w-5 text-[#B31B1B]" />
              Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              {AAU_SCHOLASTIC_ELIGIBILITY.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#B31B1B] font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card id="cost" className="border-[#D3B574]/40 bg-[#003366]/5 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Shirt className="h-5 w-5 text-[#B31B1B]" />
              Cost & what&apos;s included
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm md:text-base">
            <p className="text-gray-800">
              Registration checkout is <strong>{formatAauScholasticDollars(AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS)}</strong>{" "}
              (tournament entry + team apparel). Hotel and van, and flight are planned separately — see breakdown below.
            </p>
            <AauScholasticPricingTable />
          </CardContent>
        </Card>

        <Card id="register" className="border-2 border-[#B31B1B]/30 shadow-md scroll-mt-24">
          <CardHeader className="bg-[#B31B1B]/5">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <ClipboardList className="h-5 w-5 text-[#B31B1B]" />
              Registration
            </CardTitle>
            <CardDescription>Invite-only — you need a code from NC United staff</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <ol className="space-y-4">
              {[
                "Receive your invite code from NC United (email or coach).",
                "Open the registration link below and enter the code.",
                "Complete athlete & parent/guardian information.",
                "Pay securely at Stripe checkout — receipt emailed automatically.",
                "After payment, go to the Team Hub for gear sizes, travel, and updates.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#002147] text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href={AAU_SCHOLASTIC_DUALS_2026.registerPath}
              className="flex w-full min-h-[52px] items-center justify-center rounded-xl bg-[#002147] px-6 py-3 text-base font-bold text-white hover:bg-[#003366] transition-colors"
            >
              Start registration →
            </a>
            <p className="text-xs text-gray-500 text-center">
              Questions? Contact {AAU_SCHOLASTIC_DUALS_2026.contactName} at{" "}
              <a href={`tel:${AAU_SCHOLASTIC_DUALS_2026.contactPhoneTel}`} className="text-[#003366] hover:underline">
                {AAU_SCHOLASTIC_DUALS_2026.contactPhone}
              </a>{" "}
              or{" "}
              <a href={`mailto:${AAU_SCHOLASTIC_DUALS_2026.contactEmail}`} className="text-[#003366] hover:underline">
                {AAU_SCHOLASTIC_DUALS_2026.contactEmail}
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <Card id="faq" className="border-[#003366]/15 shadow-sm scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-[#002147]">FAQ for parents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {AAU_SCHOLASTIC_PARENT_FAQ.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-[#002147] mb-1">{q}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#003366]/15 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <Phone className="h-5 w-5 text-[#B31B1B]" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 space-y-2">
            <p>
              <strong>{AAU_SCHOLASTIC_DUALS_2026.contactName}</strong> — NC United National Team
            </p>
            <p>
              <a href={`tel:${AAU_SCHOLASTIC_DUALS_2026.contactPhoneTel}`} className="text-[#003366] font-medium hover:underline">
                {AAU_SCHOLASTIC_DUALS_2026.contactPhone}
              </a>
            </p>
            <p>
              <a href={`mailto:${AAU_SCHOLASTIC_DUALS_2026.contactEmail}`} className="text-[#003366] font-medium hover:underline">
                {AAU_SCHOLASTIC_DUALS_2026.contactEmail}
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
