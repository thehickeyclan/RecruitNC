import { CheckCircle2, Clock, LogIn } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  AAU_SCHOLASTIC_DUALS_2026,
  AAU_SCHOLASTIC_EVENT_SLUG,
  formatAauScholasticDollars,
} from "@/lib/aau-scholastic-duals-2026-content"
import {
  listNhscaDuals2026Registrations,
  nhscaDualsRegistrationIsPaid,
  nhscaDualsRegistrationOrderLines,
  nhscaDualsRegistrationOrderSummary,
} from "@/lib/nhsca-duals-2026-registrations"

function formatPaidDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

export async function AauScholasticYourPaymentSection() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id && !user?.email) {
    return (
      <Card id="your-payment" className="border-[#003366]/20 scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-[#002147]">Your registration &amp; payment</CardTitle>
          <CardDescription>Sign in to see whether your athlete&apos;s AAU registration is paid.</CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={`/auth/signin?returnTo=${encodeURIComponent("/national-team/scholastic-duals-2026#your-payment")}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#002147] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003366]"
          >
            <LogIn className="h-4 w-4" />
            Sign in to view payment status
          </a>
        </CardContent>
      </Card>
    )
  }

  const admin = createAdminClient()
  const registrations = await listNhscaDuals2026Registrations(admin, {
    isAdmin: false,
    viewerUserId: user.id,
    viewerEmail: user.email ?? null,
    eventSlug: AAU_SCHOLASTIC_EVENT_SLUG,
  })

  if (registrations.length === 0) {
    return (
      <Card id="your-payment" className="border-[#003366]/20 scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-[#002147]">Your registration &amp; payment</CardTitle>
          <CardDescription>
            No AAU Scholastic registration is linked to this account yet ({user.email}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            After you register with your invite code, payment status will appear here. Use the same email at Stripe
            checkout or sign in with the parent account you used on the form.
          </p>
          <a
            href={AAU_SCHOLASTIC_DUALS_2026.registerPath}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#002147]/25 px-4 py-2 font-semibold text-[#002147] hover:bg-[#002147]/5"
          >
            Start registration →
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="your-payment" className="border-[#003366]/20 scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-[#002147]">Your registration &amp; payment</CardTitle>
        <CardDescription>Linked to {user.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {registrations.map((reg) => {
          const paid = nhscaDualsRegistrationIsPaid(reg)
          const lineItems = nhscaDualsRegistrationOrderLines(reg)
          const summary = nhscaDualsRegistrationOrderSummary(reg)
          const totalCents = (reg.reg_fee_cents || 0) + (reg.apparel_fee_cents || 0)

          return (
            <div
              key={reg.id}
              className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#002147]">
                    {reg.athlete_first_name} {reg.athlete_last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {reg.primary_weight} lbs · {reg.high_school} ({reg.graduation_year})
                  </p>
                </div>
                {paid ? (
                  <Badge className="bg-green-600 hover:bg-green-600 text-white border-0 gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Paid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500 text-amber-800 gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Payment pending
                  </Badge>
                )}
              </div>

              {paid ? (
                <>
                  {lineItems.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {lineItems.map((item) => (
                        <li key={item.name} className="flex justify-between gap-3 text-gray-700">
                          <span>{item.name}</span>
                          <span className="tabular-nums font-medium">{formatAauScholasticDollars(item.amount_cents / 100)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">{summary}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200 text-sm">
                    <span className="font-semibold text-[#002147]">
                      Total {formatAauScholasticDollars(totalCents / 100)}
                    </span>
                    <span className="text-gray-500">
                      {reg.order_number ? `Order ${reg.order_number}` : "Paid"} ·{" "}
                      {formatPaidDate(reg.updated_at ?? reg.created_at)}
                    </span>
                  </div>
                  {reg.fee_receipt_email_sent_at ? (
                    <p className="text-xs text-gray-500">
                      Receipt emailed {formatPaidDate(reg.fee_receipt_email_sent_at)}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    Registration saved — complete Stripe checkout to confirm your spot (
                    {formatAauScholasticDollars(totalCents / 100)}).
                  </p>
                  <a
                    href={AAU_SCHOLASTIC_DUALS_2026.registerPath}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#B31B1B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9a1616]"
                  >
                    Continue to payment →
                  </a>
                </div>
              )}
            </div>
          )
        })}

        <p className="text-xs text-gray-500">
          Full order history is also on the{" "}
          <a href={`${AAU_SCHOLASTIC_DUALS_2026.hubPath}?tab=payments`} className="text-[#003366] hover:underline">
            Team Hub → Payments
          </a>{" "}
          tab after you sign in.
        </p>
      </CardContent>
    </Card>
  )
}
