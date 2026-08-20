import { describe, expect, it } from "vitest"
import { AAU_SCHOLASTIC_ALL_CHECKOUT_LINES, AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import {
  AAU_SCHOLASTIC_CATALOG,
  aauScholasticSkuForLineId,
  inferNationalTeamLineKey,
  nationalTeamLineCategory,
  nationalTeamProductByKey,
  nationalTeamSkuForLine,
  nationalTeamVariantForLineKey,
} from "@/lib/national-team-product-catalog"

describe("AAU Scholastic product catalog", () => {
  it("maps every AAU page line to a trackable SKU and price", () => {
    expect(AAU_SCHOLASTIC_CATALOG).toHaveLength(7)
    for (const line of AAU_SCHOLASTIC_ALL_CHECKOUT_LINES) {
      const product = nationalTeamProductByKey(AAU_SCHOLASTIC_EVENT_SLUG, line.id)
      expect(product, `missing catalog entry for ${line.id}`).toBeDefined()
      expect(product!.sku).toBe(aauScholasticSkuForLineId(line.id))
      expect(product!.defaultCents).toBe(line.dollars * 100)
      // The page may elaborate where the catalog names. "Singlet (Pepsi or Pinstripes)" tells a
      // buyer they have a style to choose; the catalog calls the product "Singlet", and that is
      // the name on the receipt. Requiring them character-identical coupled two independent copy
      // decisions and broke the moment the page got clearer. What must hold is that they still
      // describe the same thing.
      expect(
        line.label.toLowerCase().startsWith(product!.label.toLowerCase()),
        `catalog label "${product!.label}" does not match page line "${line.label}"`,
      ).toBe(true)
    }
  })

  it("assigns travel vs apparel vs registration categories", () => {
    expect(nationalTeamLineCategory(AAU_SCHOLASTIC_EVENT_SLUG, { key: "hotel_van" })).toBe("travel")
    expect(nationalTeamLineCategory(AAU_SCHOLASTIC_EVENT_SLUG, { key: "flight" })).toBe("travel")
    expect(nationalTeamLineCategory(AAU_SCHOLASTIC_EVENT_SLUG, { key: "singlet" })).toBe("apparel")
    expect(nationalTeamLineCategory(AAU_SCHOLASTIC_EVENT_SLUG, { key: "tournament_reg" })).toBe("registration")
  })

  it("infers line keys and SKUs from display names", () => {
    expect(inferNationalTeamLineKey(AAU_SCHOLASTIC_EVENT_SLUG, "Hotel & team van")).toBe("hotel_van")
    expect(nationalTeamSkuForLine(AAU_SCHOLASTIC_EVENT_SLUG, { name: "Flight" })).toBe("AAU26-FLIGHT")
    expect(nationalTeamSkuForLine(AAU_SCHOLASTIC_EVENT_SLUG, { key: "tee", name: "Tee" })).toBe("AAU26-TEE")
  })

  it("sets apparel sizes on variants and travel as N/A", () => {
    const travel = nationalTeamVariantForLineKey(AAU_SCHOLASTIC_EVENT_SLUG, "hotel_van", {})
    expect(travel).toEqual({ color: "Travel", size: "N/A" })

    const singlet = nationalTeamVariantForLineKey(AAU_SCHOLASTIC_EVENT_SLUG, "singlet", { singlet_size: "M" })
    expect(singlet.size).toBe("M")
  })
})
