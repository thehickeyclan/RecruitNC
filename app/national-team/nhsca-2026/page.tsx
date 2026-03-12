import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Lock, Trophy, Scale, Clock, AlertCircle, Award, BookOpen, History, ExternalLink, UsersRound, Phone } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { NHSCA2026EventBlock } from "@/components/national-team/nhsca-2026-event-block"

export default function NHSCA2026EventPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="w-full bg-gradient-to-br from-[#002147] via-[#003366] to-[#002147] text-white">
        <div className="relative w-full aspect-[21/9] min-h-[200px] md:min-h-[280px] max-h-[400px]">
          <Image
            src="/images/nhsca-virginia-beach-arena.png"
            alt=""
            fill
            className="object-cover opacity-40"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002147] via-[#002147]/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <Image
              src="/images/nhsca-national-duals-logo.png"
              alt="NHSCA National Duals"
              width={180}
              height={72}
              className="mb-4 h-14 md:h-16 w-auto object-contain drop-shadow-lg"
              priority
            />
            <Badge className="mb-3 bg-[#D3B574] text-[#003366] hover:bg-[#D3B574] border-0 font-semibold">
              NC United National Team
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-1 drop-shadow">27th Annual National Duals</h1>
            <p className="text-blue-100 text-lg md:text-xl font-medium">Memorial Day Weekend · May 23–25, 2026</p>
            <p className="text-[#D3B574] mt-2 text-base md:text-lg font-medium">Virginia Beach Sports Center</p>
          </div>
        </div>
        <div className="w-full bg-[#002147] px-4 py-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-xl bg-[#B31B1B] hover:bg-[#9a1616] text-white font-semibold border-0 shadow-md">
            <a href="/national-team/hub">Team Hub</a>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl border-[#D3B574]/60 text-[#D3B574] hover:bg-[#D3B574]/20 hover:text-white">
            <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer">
              Official event & registration
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <a href="/national-team" className="text-sm text-white/90 hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            ← Back to National Team
          </a>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <nav className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <a href="#coaches" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Coaches
          </a>
          <a href="#event-details" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Event details
          </a>
          <a href="#schedule" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            Schedule
          </a>
          <a href="/national-team/interest-form" className="rounded-full bg-[#B31B1B]/20 px-4 py-2 text-[#B31B1B] font-medium hover:bg-[#B31B1B]/30">
            Express interest
          </a>
          <a href="/national-team/nhsca-2025-results" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20">
            2025 results
          </a>
          <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#003366]/10 px-4 py-2 text-[#003366] font-medium hover:bg-[#003366]/20 inline-flex items-center gap-1">
            Official site
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </nav>

        <NHSCA2026EventBlock />

        {/* Last year's team */}
        <Card className="border-[#D3B574]/50 bg-gradient-to-br from-[#002147]/5 to-[#003366]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003366]">
              <History className="h-5 w-5" />
              2025 NC United team
            </CardTitle>
            <CardDescription>First all-North Carolina team to reach the Round of 16</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>
              Check out last year’s record-breaking all-NC team at NHSCA Duals 2025: dual results, individual records, and photos from Virginia Beach.
            </p>
            <Button asChild className="rounded-xl bg-[#003366] hover:bg-[#002147] text-white font-semibold shadow-sm">
              <a href="/national-team/nhsca-2025-results">
                View 2025 NHSCA Duals results →
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Invite-only registration */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Lock className="h-5 w-5" />
              Invite-only registration
            </CardTitle>
            <CardDescription className="text-amber-800">
              This event is invite-only. Selected athletes receive registration details and a private link by email.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-amber-800 text-sm space-y-3">
            <p>
              If you have been invited, use the registration link and invite code from your email to complete sign-up and payment. Costs are shown on that private registration flow.
            </p>
            <p>Not invited yet? Use the interest form to be considered for the team.</p>
            <p className="pt-2 border-t border-amber-200">
              <strong>Already registered?</strong> Rosters, gear sizes, hotel info, and team chat are all in one place: the members-only Team Hub.
            </p>
            <Button asChild className="bg-[#003366] hover:bg-[#003366]/90 text-white mt-2">
              <a href="/national-team/hub">Go to Team Hub</a>
            </Button>
          </CardContent>
        </Card>

        {/* Interest form vs registration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#003366]" />
              Interest form vs. event registration
            </CardTitle>
            <CardDescription>Two different steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700">
            <p>
              <strong>Interest form</strong> — For athletes who want to be considered for the national team or future events. You’re not committing or paying; you’re expressing interest. Invites to specific tournaments (like NHSCA 2026) are sent later based on merit and capacity.
            </p>
            <p>
              <strong>Event registration</strong> — For athletes who have already been invited. You received a private link and invite code; that’s where you complete registration and payment and are added to the roster.
            </p>
            <Button asChild variant="outline" className="rounded-xl border-2 border-[#003366] text-[#003366] hover:bg-[#003366]/10 font-medium">
              <a href="/national-team/interest-form">Go to interest form</a>
            </Button>
          </CardContent>
        </Card>

        <div className="text-center pt-4 pb-8">
          <Link href="/national-team" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#003366]/30 bg-[#003366]/5 px-5 py-2.5 text-sm font-semibold text-[#003366] hover:bg-[#003366]/10 transition-colors">
            ← Back to National Team
          </Link>
          <p className="mt-3 text-xs text-gray-400">Event info · Coaches · Schedule · Updated March 2026</p>
        </div>
      </div>
    </div>
  )
}
