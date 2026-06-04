"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, DollarSign, ArrowRight, ArrowLeft, Trophy, KeyRound, Coins, BarChart3 } from "lucide-react"
import { HardLink } from "@/components/hard-link"

const NATIONAL_TEAM_NAVY = "#003366"
const GOLD = "#D3B574"

const sections = [
  {
    href: "/admin/national-team-submissions",
    title: "National team interest",
    description: "Interest form responses (e.g. NHSCA, MS). View and manage national_team_interest_forms submissions.",
    icon: FileText,
  },
  {
    href: "/admin/blue/national-team-payments",
    title: "National team payments",
    description: "NHSCA 2026 (and other events): who has paid, send payment receipts, and view orders.",
    icon: DollarSign,
  },
  {
    href: "/admin/blue/aau-duals-roster-payments",
    title: "AAU Duals roster payments",
    description: "Full AAU starter roster with tournament reg, apparel, flight, and hotel columns — dollars paid per wrestler.",
    icon: BarChart3,
  },
  {
    href: "/admin/blue/national-team-orders-report",
    title: "Orders report",
    description: "Filterable report of every NHSCA hub order — registration, van, hotel, gear — with CSV export.",
    icon: BarChart3,
  },
  {
    href: "/admin/national-team/gear-images",
    title: "Gear images (BG removal)",
    description: "Remove backgrounds from NHSCA Duals 2026 team gear mockups for the Payments carousel.",
    icon: Trophy,
  },
  {
    href: "/admin/national-team/invite-codes",
    title: "Invite codes",
    description: "Create and manage invite codes for NHSCA 2026 registration. Copy the private registration URL to send to invitees.",
    icon: KeyRound,
  },
  {
    href: "/admin/fundraising",
    title: "Spartan & fundraising",
    description: "Spartan 2026 campaign: Stripe export hints, fundraising codes, leaderboards scratchpad.",
    icon: Coins,
  },
]

export default function AdminNationalTeamHubPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin"><ArrowLeft className="h-4 w-4" /></HardLink>
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: NATIONAL_TEAM_NAVY }}>National team</h1>
            <p className="text-gray-600 mt-1">Interest forms and event payments (e.g. NHSCA 2026).</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(({ href, title, description, icon: Icon }) => (
            <HardLink key={href} href={href} className="block w-full text-left">
              <Card
                className="border-t-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer h-full"
                style={{ borderTopColor: GOLD }}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-lg p-3" style={{ backgroundColor: `${GOLD}30` }}>
                    <Icon className="h-6 w-6" style={{ color: NATIONAL_TEAM_NAVY }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center justify-between gap-2">
                      {title}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription className="mt-1">{description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </HardLink>
          ))}
        </div>
      </div>
    </div>
  )
}
