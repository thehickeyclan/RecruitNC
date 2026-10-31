import { describe, expect, it } from "vitest"

import { nameSlug, parseShortSlug, resolveShortSlug, shortSlugFor } from "./profile-short-link"

const xavier = { id: "f5a87c74-7dc6-427c-b205-da34e24c2375", firstName: "Xavier", lastName: "Bernthal", graduationyear: 2029, created_at: "2025-01-01" }
const older = { id: "aaaa1111-0000-0000-0000-000000000000", firstName: "John", lastName: "Smith", graduationyear: 2028, created_at: "2024-01-01" }
const newer = { id: "bbbb2222-0000-0000-0000-000000000000", firstName: "John", lastName: "Smith", graduationyear: 2028, created_at: "2026-01-01" }

describe("short profile links", () => {
  it("is the name and class", () => {
    expect(shortSlugFor(xavier, [xavier])).toBe("xavier-bernthal-2029")
  })

  it("drops apostrophes, accents and punctuation", () => {
    expect(nameSlug("Ja'Kari", "D’Ettore")).toBe("jakari-dettore")
    expect(nameSlug("José", "De La Torre")).toBe("jose-de-la-torre")
    expect(nameSlug("Danny", "Ross II")).toBe("danny-ross-ii")
  })

  it("keeps the plain link for the older of two namesakes, so a newer one never takes it", () => {
    expect(shortSlugFor(older, [older, newer])).toBe("john-smith-2028")
    expect(shortSlugFor(newer, [older, newer])).toBe("john-smith-2028-bbbb")
  })

  it("finds the wrestler each link was made for", () => {
    for (const a of [older, newer]) {
      const slug = shortSlugFor(a, [older, newer])!
      expect(resolveShortSlug(parseShortSlug(slug)!, [older, newer])?.id).toBe(a.id)
    }
    expect(resolveShortSlug(parseShortSlug("xavier-bernthal-2029")!, [xavier])?.id).toBe(xavier.id)
  })

  it("finds nobody for a name not in the class", () => {
    expect(resolveShortSlug(parseShortSlug("nobody-here-2029")!, [xavier])).toBeNull()
  })

  it("reads a four-letter hex surname without a class as a name, not a suffix", () => {
    const bella = { id: "cccc3333-0000-0000-0000-000000000000", firstName: "Bella", lastName: "Abba", graduationyear: null, created_at: "2025-01-01" }
    expect(resolveShortSlug(parseShortSlug(shortSlugFor(bella, [bella])!)!, [bella])?.id).toBe(bella.id)
  })
})
