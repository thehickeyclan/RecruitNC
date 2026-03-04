import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NHSCA2026EventPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-[#002147] via-[#003366] to-[#002147] text-white py-12 md:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-[#D3B574] text-[#003366] hover:bg-[#D3B574] border-0">
            National Team
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">NHSCA National Duals 2026</h1>
          <p className="text-blue-100 text-lg">NC United representation at the NHSCA National Duals</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#003366]" />
              Event details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              <strong>Event:</strong> NHSCA National Duals 2026
            </p>
            <p>
              <strong>Dates:</strong> Spring/Summer 2026 (exact dates TBD)
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
              <span>Location and schedule will be shared with selected athletes and families.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Lock className="h-5 w-5" />
              Invite-only registration
            </CardTitle>
            <CardDescription className="text-amber-800">
              This event is invite-only. Selected athletes will receive registration details and a private link by email. There is no public “Register now” for this event.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-amber-800 text-sm">
            <p>
              If you have been invited, use the registration link and invite code from your email to complete sign-up and payment. Costs and payment are only shown on that private registration flow.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#003366]" />
              Interest form vs. event registration
            </CardTitle>
            <CardDescription>
              Two different steps:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700">
            <p>
              <strong>Interest form</strong> — For athletes who want to be considered for the national team or future events. You’re not committing or paying; you’re just expressing interest. Invites to specific tournaments (like NHSCA 2026) are sent later based on merit and capacity.
            </p>
            <p>
              <strong>Event registration</strong> — For athletes who have already been invited to a specific tournament. You received a private link and invite code; that’s where you complete registration and payment and are added to the roster.
            </p>
            <p className="pt-2">
              Not invited yet? Use the interest form to get on the list.
            </p>
            <Button asChild variant="outline" className="border-[#003366] text-[#003366] hover:bg-[#003366]/10">
              <a href="/national-team/interest-form">Go to interest form</a>
            </Button>
          </CardContent>
        </Card>

        <div className="text-center pt-4">
          <Link href="/national-team" className="text-[#003366] hover:underline font-medium">
            ← Back to National Team
          </Link>
        </div>
      </div>
    </div>
  )
}
