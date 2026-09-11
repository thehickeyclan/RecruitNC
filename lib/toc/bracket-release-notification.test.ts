import { describe, expect, it } from "vitest"
import { buildBracketReleasePush } from "./bracket-release-notification"

describe("buildBracketReleasePush", () => {
  it("names the weight when only one goes out", () => {
    const push = buildBracketReleasePush([117])
    expect(push.title).toBe("Brackets are live")
    expect(push.body).toBe("The 117 lb bracket is live. Tap to see the draw.")
  })

  it("lists a handful, in weight order however they arrive", () => {
    // A parent scanning a lock screen is looking for one number; a bare count hides it.
    expect(buildBracketReleasePush([149, 117, 125]).body).toBe("117, 125 and 149 lbs. Tap to see the draws.")
  })

  it("counts rather than lists once the list stops being readable", () => {
    expect(buildBracketReleasePush([117, 125, 133, 141, 149]).body).toBe(
      "5 weight classes. Tap to see the draws.",
    )
  })

  it("says All only when every weight goes out", () => {
    const every = [117, 125, 133, 141, 149, 157, 165, 174, 197, 285]
    expect(buildBracketReleasePush(every).body).toBe("All 10 weight classes. Tap to see the draws.")
    // One weight held back for a redraw: the other families must not read that theirs is missing.
    expect(buildBracketReleasePush(every.filter((w) => w !== 141)).body).toBe(
      "9 weight classes. Tap to see the draws.",
    )
  })

  it("points at the bracket screen", () => {
    expect(buildBracketReleasePush([117]).data).toEqual({ kind: "toc-brackets", path: "/toc-bracket" })
  })
})
