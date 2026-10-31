import { describe, expect, it } from "vitest"
import { super32HomeBanner } from "./home-banner"

describe("super32HomeBanner", () => {
  it("is live through the finals, then the recap leads until 8 November, then gone", () => {
    expect(super32HomeBanner(new Date("2026-10-23T12:00:00-04:00"))).toBe("live")
    expect(super32HomeBanner(new Date("2026-10-25T22:00:00-04:00"))).toBe("live")
    expect(super32HomeBanner(new Date("2026-10-26T09:00:00-04:00"))).toBe("recap")
    expect(super32HomeBanner(new Date("2026-11-08T20:00:00-05:00"))).toBe("recap")
    expect(super32HomeBanner(new Date("2026-11-09T09:00:00-05:00"))).toBeNull()
  })
})
