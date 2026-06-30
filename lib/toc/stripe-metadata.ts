/** Stripe Checkout metadata for Tournament of Champions athlete registration ($75). */

export const TOC_STRIPE_REGISTRATION_TYPE = "TOC Reg" as const
export const TOC_STRIPE_SOURCE = "toc_reg" as const

export type TocRegistrationCheckoutMetadata = {
  business: "nc_united"
  channel: "recruitnc"
  category: "registration"
  registration_type: typeof TOC_STRIPE_REGISTRATION_TYPE
  source: typeof TOC_STRIPE_SOURCE
  invitation_id: string
  athlete_id: string
  weight_class: string
  athlete_name: string
}

export function buildTocRegistrationCheckoutMetadata(params: {
  invitationId: string
  athleteId: string
  weightClass: number
  athleteName: string
}): TocRegistrationCheckoutMetadata {
  return {
    business: "nc_united",
    channel: "recruitnc",
    category: "registration",
    registration_type: TOC_STRIPE_REGISTRATION_TYPE,
    source: TOC_STRIPE_SOURCE,
    invitation_id: params.invitationId,
    athlete_id: params.athleteId,
    weight_class: String(params.weightClass),
    athlete_name: params.athleteName.trim().slice(0, 120),
  }
}

export function isTocRegistrationStripeMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): boolean {
  const m = metadata ?? {}
  return m.source === TOC_STRIPE_SOURCE && m.registration_type === TOC_STRIPE_REGISTRATION_TYPE
}
