import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Pause, Ban, Receipt, CalendarClock } from "lucide-react"

export const metadata = {
  title: "Manage Blue Subscription | NC United",
  description: "Pause, cancel, update payment, and view billing for NC United Blue membership.",
}

export default async function BlueBillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/profile#nc-united-blue")
  }

  return (
    <div className="min-h-screen bg-[#0A1628] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="border border-[#D3B574]/30 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-[#03154C] flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              NC United Blue — Billing
            </CardTitle>
            <CardDescription>
              Sign in with the parent email you used at registration to manage your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-gray-700">
            <p>After sign-in, open <strong>Profile → NC United Blue</strong> to:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CalendarClock className="h-4 w-4 text-[#03154C] mt-0.5 shrink-0" />
                See next bill date and last payment
              </li>
              <li className="flex items-start gap-2">
                <Receipt className="h-4 w-4 text-[#03154C] mt-0.5 shrink-0" />
                Open Stripe billing portal for invoices &amp; card updates
              </li>
              <li className="flex items-start gap-2">
                <Pause className="h-4 w-4 text-[#03154C] mt-0.5 shrink-0" />
                Pause with a resume date
              </li>
              <li className="flex items-start gap-2">
                <Ban className="h-4 w-4 text-[#03154C] mt-0.5 shrink-0" />
                Cancel at end of billing period
              </li>
            </ul>
            <HardLink href="/auth/signin">
              <Button className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white">Sign in</Button>
            </HardLink>
            <p className="text-xs text-gray-500 text-center">
              Not a member yet?{" "}
              <HardLink href="/blue" className="text-[#03154C] underline">
                Learn about Blue
              </HardLink>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
