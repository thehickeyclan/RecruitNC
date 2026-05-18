import { describe, expect, it } from "vitest"
import { collectUuidStringsDeep, extractGuildParentIdFromGrantResponseJson } from "@/lib/guild-restore-from-allocations"

describe("extractGuildParentIdFromGrantResponseJson", () => {
  const id = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee"

  it("reads common top-level keys", () => {
    expect(extractGuildParentIdFromGrantResponseJson({ guild_parent_id: id })).toBe(id)
    expect(extractGuildParentIdFromGrantResponseJson({ parentId: id })).toBe(id)
  })

  it("reads nested data object once", () => {
    expect(extractGuildParentIdFromGrantResponseJson({ data: { guild_parent_id: id } })).toBe(id)
  })

  it("returns null for stub bodies", () => {
    expect(extractGuildParentIdFromGrantResponseJson({ stub: true })).toBe(null)
  })
})

describe("collectUuidStringsDeep", () => {
  const a = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee"
  const b = "bbbbbbbb-bbbb-4ccc-bddd-eeeeeeeeeeee"

  it("finds UUIDs nested in arrays and objects", () => {
    const out = new Set<string>()
    collectUuidStringsDeep({ credits: [{ account: a }, { other: b }] }, out, 0)
    expect(out.has(a)).toBe(true)
    expect(out.has(b)).toBe(true)
  })
})
