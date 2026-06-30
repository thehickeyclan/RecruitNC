import { describe, expect, it } from "vitest"
import {
  buildTocRegistrationCheckoutMetadata,
  isTocRegistrationStripeMetadata,
  TOC_STRIPE_REGISTRATION_TYPE,
  TOC_STRIPE_SOURCE,
} from "@/lib/toc/stripe-metadata"

describe("TOC registration Stripe metadata", () => {
  it("tags checkout as TOC Reg with toc_reg source", () => {
    const metadata = buildTocRegistrationCheckoutMetadata({
      invitationId: "11111111-1111-1111-1111-111111111111",
      athleteId: "22222222-2222-2222-2222-222222222222",
      weightClass: 174,
      athleteName: "Tobin McSomething",
    })

    expect(metadata.registration_type).toBe("TOC Reg")
    expect(metadata.source).toBe("toc_reg")
    expect(metadata.business).toBe("nc_united")
    expect(metadata.channel).toBe("recruitnc")
    expect(metadata.category).toBe("registration")
    expect(metadata.weight_class).toBe("174")
    expect(isTocRegistrationStripeMetadata(metadata)).toBe(true)
  })

  it("rejects unrelated checkout metadata", () => {
    expect(
      isTocRegistrationStripeMetadata({
        source: TOC_STRIPE_SOURCE,
        registration_type: "Other",
      }),
    ).toBe(false)
    expect(
      isTocRegistrationStripeMetadata({
        source: "national_team",
        registration_type: TOC_STRIPE_REGISTRATION_TYPE,
      }),
    ).toBe(false)
  })
})
