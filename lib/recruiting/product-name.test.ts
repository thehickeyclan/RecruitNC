import { afterEach, describe, expect, it, vi } from "vitest"
import { productName } from "@/lib/recruiting/product-name"

describe("the product's name in generated text", () => {
  afterEach(() => vi.unstubAllEnvs())
  it("is RecruitWrestlers on its own Vercel project and RecruitNC on NC United's", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.recruitwrestlers.com")
    expect(productName()).toBe("RecruitWrestlers")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.ncwrestlingunited.com")
    expect(productName()).toBe("RecruitNC")
  })
})
