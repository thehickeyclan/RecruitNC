import { afterEach, describe, expect, it, vi } from "vitest"
import { productName } from "@/lib/recruiting/product-name"

describe("the product's name in generated text", () => {
  afterEach(() => vi.unstubAllEnvs())
  it("is RecruitWrestlers on both projects (RecruitNC retired, 1 Nov 2026)", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.recruitwrestlers.com")
    expect(productName()).toBe("RecruitWrestlers")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.ncwrestlingunited.com")
    expect(productName()).toBe("RecruitWrestlers")
  })
})
