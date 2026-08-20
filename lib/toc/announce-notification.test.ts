import { describe, expect, it } from "vitest"
import { buildTocAnnouncePush } from "./announce-notification"

describe("buildTocAnnouncePush", () => {
  it("names two wrestlers and counts the rest", () => {
    const push = buildTocAnnouncePush({
      weightClass: 132,
      athleteNames: ["Cormac Beck", "Mac Johnson", "Aidan Gore", "Tye Johnson"],
    })
    expect(push.title).toBe("132 lbs is live")
    expect(push.body).toBe("Cormac Beck, Mac Johnson and 2 more. Tap to see the full weight.")
  })

  it("reads naturally when the weight has exactly two", () => {
    const push = buildTocAnnouncePush({
      weightClass: 106,
      athleteNames: ["Cormac Beck", "Mac Johnson"],
    })
    expect(push.body).toBe("Cormac Beck and Mac Johnson — tap to see the full weight.")
  })

  it("reads naturally with one", () => {
    const push = buildTocAnnouncePush({ weightClass: 285, athleteNames: ["Cormac Beck"] })
    expect(push.body).toBe("Cormac Beck — tap to see the full weight.")
  })

  it("still says something useful when no names came through", () => {
    const push = buildTocAnnouncePush({ weightClass: 150, athleteNames: [] })
    expect(push.body).toBe("The field for this weight is live. Tap to see who's in.")
    expect(push.title).toBe("150 lbs is live")
  })

  it("ignores blank names rather than counting them", () => {
    const push = buildTocAnnouncePush({
      weightClass: 175,
      athleteNames: ["Cormac Beck", "   ", "Mac Johnson"],
    })
    expect(push.body).toBe("Cormac Beck, Mac Johnson and 1 more. Tap to see the full weight.")
  })

  it("carries a deep link the app can route on", () => {
    const push = buildTocAnnouncePush({ weightClass: 132, athleteNames: ["Cormac Beck"] })
    expect(push.data).toEqual({ kind: "toc-field", weightClass: 132, path: "/toc-field?weight=132" })
  })
})
