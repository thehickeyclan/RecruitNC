import { describe, expect, it } from "vitest"
import { buildTocAnnouncePush, pickHeadliners } from "./announce-notification"

describe("buildTocAnnouncePush", () => {
  it("names two wrestlers and counts the rest, alphabetically when none has a credential", () => {
    const push = buildTocAnnouncePush({
      weightClass: 132,
      athletes: [{ name: "Cormac Beck" }, { name: "Mac Johnson" }, { name: "Aidan Gore" }, { name: "Tye Johnson" }],
    })
    expect(push.title).toBe("132 lbs is live")
    expect(push.body).toBe("Aidan Gore, Cormac Beck and 2 more. Tap to see the full weight.")
  })

  it("reads naturally when the weight has exactly two", () => {
    const push = buildTocAnnouncePush({
      weightClass: 106,
      athletes: [{ name: "Cormac Beck" }, { name: "Mac Johnson" }],
    })
    expect(push.body).toBe("Cormac Beck and Mac Johnson — tap to see the full weight.")
  })

  it("reads naturally with one", () => {
    const push = buildTocAnnouncePush({ weightClass: 285, athletes: [{ name: "Cormac Beck" }] })
    expect(push.body).toBe("Cormac Beck — tap to see the full weight.")
  })

  it("still says something useful when no names came through", () => {
    const push = buildTocAnnouncePush({ weightClass: 150, athletes: [] })
    expect(push.body).toBe("The field for this weight is live. Tap to see who's in.")
    expect(push.title).toBe("150 lbs is live")
  })

  it("ignores blank names rather than counting them", () => {
    const push = buildTocAnnouncePush({
      weightClass: 175,
      athletes: [{ name: "Cormac Beck" }, { name: "   " }, { name: "Mac Johnson" }],
    })
    expect(push.body).toBe("Cormac Beck, Mac Johnson and 1 more. Tap to see the full weight.")
  })

  it("carries a deep link the app can route on", () => {
    const push = buildTocAnnouncePush({ weightClass: 132, athletes: [{ name: "Cormac Beck" }] })
    expect(push.data).toEqual({ kind: "toc-field", weightClass: 132, path: "/toc-field?weight=132" })
  })
})

describe("pickHeadliners", () => {
  const a = (name: string, ...kinds: string[]) => ({ name, credentials: kinds.map((kind) => ({ kind })) })

  it("leads with the strongest accolades, not the alphabet", () => {
    // The field page is alphabetical, so Adams would otherwise headline over an All-American.
    const field = [a("Adams, no credentials"), a("Raper", "all-american"), a("Myles", "state-champion")]
    expect(pickHeadliners(field)).toEqual(["Raper", "Myles"])
  })

  it("ranks All-American above state champion above placer", () => {
    const field = [a("Placer", "state-placer"), a("Champ", "state-champion"), a("AA", "all-american")]
    expect(pickHeadliners(field, 3)).toEqual(["AA", "Champ", "Placer"])
  })

  it("uses a wrestler's best credential, not their first", () => {
    const field = [a("Both", "state-placer", "all-american"), a("Champ", "state-champion")]
    expect(pickHeadliners(field)[0]).toBe("Both")
  })

  it("falls back to alphabetical when nobody has a credential", () => {
    expect(pickHeadliners([a("Zeta"), a("Alpha")])).toEqual(["Alpha", "Zeta"])
  })

  it("breaks ties alphabetically so the same two are picked every send", () => {
    const field = [a("Younger", "state-champion"), a("Older", "state-champion")]
    expect(pickHeadliners(field)).toEqual(["Older", "Younger"])
  })

  it("ignores athletes with no name", () => {
    expect(pickHeadliners([a("  "), a("Real", "state-champion")])).toEqual(["Real"])
  })
})
