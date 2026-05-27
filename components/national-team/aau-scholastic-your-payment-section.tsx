import { CheckCircle2, Clock } from "lucide-react"
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
import {
  ScholasticDualsSection,
  scholasticInsetClass,
  scholasticLinkClass,
} from "@/components/national-team/scholastic-duals-section"
import { aauPrimaryBtnClass, aauPriceClass } from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"

function formatPaidDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

export async function AauScholasticYourPaymentSection() {
  try {
    return await AauScholasticYourPaymentSectionInner()
  } catch (err) {
    console.error("[RecruitNC] aau-scholastic-your-payment-section:", err)
    return (
      <ScholasticDualsSection
        id="your-payment"
        title="Your registration & payment"
        description="Payment status is temporarily unavailable."
      >
        <p className="text-sm text-white/75">
          We could not load your registration right now. Try refreshing this page, or email{" "}
          <a href={`mailto:${AAU_SCHOLASTIC_DUALS_2026.contactEmail}`} className={scholasticLinkClass}>
            {AAU_SCHOLASTIC_DUALS_2026.contactEmail}
          </a>{" "}
          if payment status still looks wrong.
        </p>
      </ScholasticDualsSection>
    )
  }
}

async function AauScholasticYourPaymentSectionInner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id && !user?.email) {
    return null
  }

  const admin = createAdminClient()
  const registrations = await listNhscaDuals2026Registrations(admin, {
    isAdmin: false,
    viewerUserId: user.id,
    viewerEmail: user.email ?? null,
    eventSlug: AAU_SCHOLASTIC_EVENT_SLUG,
  })

  if (registrations.length === 0) {
    return null
  }

  return (
    <ScholasticDualsSection
      id="your-payment"
      title="Your registration & payment"
      description={`Linked to ${user.email}`}
      contentClassName="space-y-4"
    >
      {registrations.map((reg) => {
        const paid = nhscaDualsRegistrationIsPaid(reg)
        const lineItems = nhscaDualsRegistrationOrderLines(reg)
        const summary = nhscaDualsRegistrationOrderSummary(reg)
        const totalCents = (reg.reg_fee_cents || 0) + (reg.apparel_fee_cents || 0)

        return (
          <div key={reg.id} className={scholasticInsetClass + " space-y-3"}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">
                  {reg.athlete_first_name} {reg.athlete_last_name}
                </p>
                <p className="text-sm text-white/60">
                  {reg.primary_weight} lbs · {reg.high_school} ({reg.graduation_year})
                </p>
              </div>
              {paid ? (
                <Badge className="bg-green-600 hover:bg-green-600 text-white border-0 gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paid
                </Badge>
              ) : (
                <Badge className="border-amber-500/50 bg-amber-950/40 text-amber-100 gap-1">
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
                      <li key={item.name} className="flex justify-between gap-3 text-white/80">
                        <span>{item.name}</span>
                        <span className={cn("tabular-nums font-medium", aauPriceClass)}>
                          {formatAauScholasticDollars(item.amount_cents / 100)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/65">{summary}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-sm">
                  <span className="font-semibold text-white">
                    Total {formatAauScholasticDollars(totalCents / 100)}
                  </span>
                  <span className="text-white/50">
                    {reg.order_number ? `Order ${reg.order_number}` : "Paid"} ·{" "}
                    {formatPaidDate(reg.updated_at ?? reg.created_at)}
                  </span>
                </div>
                {reg.fee_receipt_email_sent_at ? (
                  <p className="text-xs text-white/45">
                    Receipt emailed {formatPaidDate(reg.fee_receipt_email_sent_at)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-white/75">
                  Registration saved — complete Stripe checkout to confirm your spot (
                  {formatAauScholasticDollars(totalCents / 100)}).
                </p>
                <a href={AAU_SCHOLASTIC_DUALS_2026.registerPath} className={cn(aauPrimaryBtnClass, "text-sm px-4 py-2")}>
                  Continue to payment →
                </a>
              </div>
            )}
          </div>
        )
      })}

      <p className="text-xs text-white/45">
        Questions about your order? Email{" "}
        <a href={`mailto:${AAU_SCHOLASTIC_DUALS_2026.contactEmail}`} className={scholasticLinkClass}>
          {AAU_SCHOLASTIC_DUALS_2026.contactEmail}
        </a>
        .
      </p>
    </ScholasticDualsSection>
  )
}
