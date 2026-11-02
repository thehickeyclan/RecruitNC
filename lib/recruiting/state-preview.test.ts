import { describe, expect, it } from "vitest"
import { isVisibleState, visibleStates } from "@/lib/recruiting/brand"
import { previewStatesForUser } from "@/lib/recruiting/state-preview"

function client(result: { data?: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {}
  q.select = () => q
  q.eq = () => q
  q.maybeSingle = async () => result
  return { from: () => q } as never
}

describe("visibleStates", () => {
  it("shows only the live states to an ordinary viewer", () => {
    // Second argument: which address. RecruitWrestlers carries every live state, NC United only NC.
    expect(visibleStates(false, true).every((s) => s.live)).toBe(true)
    expect(visibleStates(false).map((s) => s.code)).toEqual(["NC"])
  })

  it("holds on either address, because it is granted per account and per state", () => {
    // The OEM rule says what a brand reports to the public, not what a named account may open.
    expect(isVisibleState("MD", false, false, ["MD"])).toBe(true)
  })

  it("shows a named state to the account it was named for, and nothing more", () => {
    const seen = visibleStates(false, true, ["MD"]).map((s) => s.code)
    expect(seen).toContain("MD")
    expect(seen).not.toContain("VA")
  })

  it("is not case or whitespace sensitive, because the column is typed by hand", () => {
    expect(visibleStates(false, true, [" md "]).map((s) => s.code)).toContain("MD")
  })

  it("still opens everything to an admin", () => {
    expect(visibleStates(true, true).length).toBe(visibleStates(true, true, []).length)
    expect(visibleStates(true).map((s) => s.code)).toContain("MD")
  })

  it("gates isVisibleState the same way", () => {
    expect(isVisibleState("MD", false)).toBe(false)
    expect(isVisibleState("MD", false, true)).toBe(false)
    expect(isVisibleState("MD", false, true, ["MD"])).toBe(true)
    expect(isVisibleState("VA", false, true, ["MD"])).toBe(false)
  })
})

describe("previewStatesForUser", () => {
  it("reads the column when it is there", async () => {
    expect(await previewStatesForUser(client({ data: { preview_states: ["md", " va "] } }), "u1")).toEqual(["MD", "VA"])
  })

  it("answers none when the column does not exist yet, rather than throwing", async () => {
    /* The query is isolated for exactly this: PostgREST refuses a whole select on an unknown
       column, so a shared query would break every page before the migration runs. */
    expect(await previewStatesForUser(client({ error: { message: 'column "preview_states" does not exist' } }), "u1")).toEqual([])
  })

  it("answers none for a signed-out viewer without asking the database", async () => {
    expect(await previewStatesForUser(client({ data: { preview_states: ["MD"] } }), null)).toEqual([])
  })
})
