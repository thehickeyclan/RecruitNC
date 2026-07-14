import { describe, expect, it } from "vitest"
import { applyRecruitNcDataDawgAnswerPostProcess } from "@/lib/recruitnc-data-dawg-postprocess"

const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

describe("applyRecruitNcDataDawgAnswerPostProcess", () => {
  it("rewrites absolute unified-profile URLs to view-profile", () => {
    const out = applyRecruitNcDataDawgAnswerPostProcess(
      `Here's what I found about [Eli](https://app.ncwrestlingunited.com/unified-profile/${id}):`,
    )
    expect(out).toContain(`https://app.ncwrestlingunited.com/view-profile?id=${id}`)
    expect(out).not.toContain("/unified-profile/")
  })
})
