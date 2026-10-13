import { describe, expect, it } from "vitest"

import { CHECKED, D1_CONTACT, LEARN_PAGES, MENS_AND_WOMENS, SOURCES, d1TrackFor, learnPage } from "./content"

const allSections = [...LEARN_PAGES.flatMap((p) => p.sections), ...Object.values(D1_CONTACT)]

describe("the rules library", () => {
  it("names a source for every section, and only sources that exist", () => {
    for (const section of allSections) {
      expect(section.sources.length, section.heading).toBeGreaterThan(0)
      for (const key of section.sources) expect(SOURCES[key], `${section.heading}: ${key}`).toBeDefined()
    }
  })

  it("cites only the governing bodies, never a recruiting service", () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.url).toMatch(/ncaa\.org|ncaaorg\.s3|fs\.ncaa\.org|naia\.org|njcaa\.org|ardor-prod-media|ardorsportshub\.com|nchsaa\.org|ncisaa\.org|ivyleague\.com|ed\.gov|studentaid\.gov|oah\.state\.nc\.us|nwcaonline\.com/)
      expect(source.url).not.toMatch(/ncsasports|flowrestling|wikipedia/)
    }
  })

  it("is about wrestling and no other sport", () => {
    const words = [
      ...Object.values(SOURCES).map((s) => s.label),
      ...LEARN_PAGES.flatMap((p) => [p.title, p.summary]),
      ...allSections.flatMap((s) => [
        s.heading,
        s.intro ?? "",
        s.reading ?? "",
        s.advice ?? "",
        s.rule ?? "",
        ...(s.bullets ?? []),
        ...(s.rows ?? []).flatMap((r) => [r.label, r.value]),
      ]),
    ].join("\n")
    expect(words).not.toMatch(/\bsports?\b|football|basketball|baseball|softball|soccer|lacrosse|volleyball|hockey|swimming|golf|tennis|track and field/i)
  })

  it("says where men's and women's wrestling differ, on every level page", () => {
    for (const slug of ["division-1", "division-2", "division-3", "naia", "njcaa"]) {
      const comparison = MENS_AND_WOMENS[slug]
      expect(comparison, slug).toBeDefined()
      expect(comparison.differences.length + comparison.same.length, slug).toBeGreaterThan(0)
      for (const key of comparison.sources) expect(SOURCES[key], `${slug}: ${key}`).toBeDefined()
      for (const d of comparison.differences) expect(d.mens, `${slug}: ${d.topic}`).not.toBe(d.womens)
    }
    // The comparison and the dated rules it summarises cannot drift apart.
    const call = MENS_AND_WOMENS["division-1"].differences[0]
    expect(call.mens).toContain(D1_CONTACT["men-2028"].rows![1].value)
    expect(call.womens).toBe(D1_CONTACT.women.rows![1].value)
  })

  it("says when it was checked", () => {
    expect(CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("gives every section something to read", () => {
    for (const section of allSections) {
      expect((section.rows?.length ?? 0) + (section.bullets?.length ?? 0), section.heading).toBeGreaterThan(0)
    }
  })

  it("puts a wrestler on the Division I dates for his class and her sport", () => {
    expect(d1TrackFor("Male", 2029)).toBe("men-2028")
    expect(d1TrackFor("Male", 2028)).toBe("men-2028")
    expect(d1TrackFor("Male", 2027)).toBe("men-2027")
    expect(d1TrackFor("Female", 2029)).toBe("women")
    expect(d1TrackFor(null, null)).toBe("men-2028")
  })

  it("has the 2028 men on April 1 and the others on June 15", () => {
    expect(D1_CONTACT["men-2028"].rows?.[0].value).toBe("April 1 of junior year")
    expect(D1_CONTACT["men-2027"].rows?.[0].value).toBe("June 15 at the end of sophomore year")
    expect(D1_CONTACT.women.rows?.[0].value).toBe("June 15 at the end of sophomore year")
    // The bylaws say who the new dates apply to, so the 2027 dates are stated, not hedged.
    expect(D1_CONTACT["men-2027"].intro).toMatch(/August 1, 2028/)
    expect(D1_CONTACT["men-2027"].reading).toBeUndefined()
  })

  it("never mentions the letter of intent as something a wrestler signs with the NCAA", () => {
    const text = JSON.stringify(LEARN_PAGES.filter((p) => p.slug.startsWith("division")))
    expect(text).not.toMatch(/NLI Signing Day|sign(s|ing)? (a|the|an) National Letter/i)
  })

  it("publishes the Eligibility Center fee only with the page it was read from", () => {
    const section = learnPage("eligibility-center")!.sections.find((x) => JSON.stringify(x).match(/\$\d/))!
    expect(section.sources).toContain("ecRegister")
    expect(section.reading).toMatch(/confirm/)
  })

  it("keeps our own advice apart from the rules", () => {
    for (const section of allSections) {
      for (const bullet of section.bullets ?? []) expect(bullet, section.heading).not.toMatch(/^(Our advice|We suggest|Ask the coach to)/)
    }
  })

  it("keeps the North Carolina page open to everyone", () => {
    expect(LEARN_PAGES.filter((p) => p.free).map((p) => p.slug)).toEqual(["staying-eligible-in-north-carolina"])
  })
})
