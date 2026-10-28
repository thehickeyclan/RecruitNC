import { afterEach, describe, expect, it, vi } from "vitest"
import { rateAthlete } from "@/lib/athlete-star-rating"
import { rankingLabel } from "@/lib/public-rankings-cap"
import { frameWebAnswer } from "@/lib/data-dawg-web-search"
import { productName } from "@/lib/recruiting/product-name"

const RANKED = { nationalRows: [], significantWins: [], prospectRanking: 4, rankingPublished: true, statePlaces: [1], nationallyRanked: false }

function rankingDetail(): string | undefined {
  return rateAthlete(RANKED).components.find((c) => c.key === "ranking")?.detail
}

describe("server-built texts name the product for the deployment", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("says RecruitWrestlers on the RecruitWrestlers project", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.recruitwrestlers.com")
    expect(rankingDetail()).toBe("RecruitWrestlers #4 in the class")
    expect(rankingLabel(4, "Female", productName())).toBe("RecruitWrestlers Women's #4")
    expect(frameWebAnswer("x", [])).toContain("Not in RecruitWrestlers data")
    expect(frameWebAnswer("x", [])).not.toContain("RecruitNC")
  })

  it("keeps RecruitNC on NC United", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.ncwrestlingunited.com")
    expect(rankingDetail()).toBe("RecruitNC #4 in the class")
    expect(rankingLabel(4, "Male", productName())).toBe("RecruitNC #4")
    expect(rankingLabel(4, "Male")).toBe("RecruitNC #4")
    expect(frameWebAnswer("x", [])).toContain("Not in RecruitNC data")
  })
})
