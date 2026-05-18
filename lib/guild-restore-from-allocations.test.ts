import { describe, expect, it } from "vitest"
import { extractGuildParentIdFromGrantResponseJson } from "@/lib/guild-restore-from-allocations"

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
