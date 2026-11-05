/**
 * The site went down three times in the week to 5 November 2026 and every time the shape was the
 * same: the database got busy, `schoolsWithApprovedCoaches` timed out, `programs` fell to 0, and
 * the old `if (programs > 0)` guard refused to cache the result. Every following request then
 * re-ran the whole sweep - fifteen paged queries over user_profiles and 12,219 analytics rows -
 * against the database that had just timed out. Load caused the failure and the failure
 * multiplied the load, until PostgREST had no free connections and every page hung.
 *
 * These tests hold the two properties that break that loop: a partial answer is still cached, and
 * concurrent callers share one sweep instead of each starting their own.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const programsLookup = vi.fn()

vi.mock("@/lib/college-programs/load", () => ({
  schoolsWithApprovedCoaches: (...args: unknown[]) => programsLookup(...args),
}))

/** A thenable that answers like a PostgREST builder, whatever chain is called on it. */
function builder(rows: Array<Record<string, unknown>>) {
  const b: Record<string, unknown> = {}
  for (const method of ["select", "order", "limit", "eq", "not", "gt", "in", "range"]) b[method] = () => b
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve, reject)
  return b
}

/** Counts how many table reads a call makes, which is what the outage was made of. */
function fakeAdmin() {
  const reads: string[] = []
  const admin = {
    from(table: string) {
      reads.push(table)
      return builder([])
    },
  }
  return { admin: admin as never, reads }
}

async function freshModule() {
  vi.resetModules()
  return await import("@/lib/platform-stats")
}

beforeEach(() => {
  programsLookup.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-05T21:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("loadPlatformStats", () => {
  it("caches a partial answer, so a failed programs lookup cannot be re-swept every request", async () => {
    const { loadPlatformStats } = await freshModule()
    programsLookup.mockRejectedValue(new Error("canceling statement due to statement timeout"))

    const { admin, reads } = fakeAdmin()
    const first = await loadPlatformStats(admin)
    expect(first.programs).toBe(0)
    const afterFirst = reads.length
    expect(afterFirst).toBeGreaterThan(0)

    // The request that used to re-run the whole sweep must now read nothing at all.
    const second = await loadPlatformStats(admin)
    expect(second).toEqual(first)
    expect(reads.length).toBe(afterFirst)
  })

  it("retries a partial answer after two minutes, not after an hour", async () => {
    const { loadPlatformStats } = await freshModule()
    programsLookup.mockRejectedValue(new Error("timeout"))

    const { admin, reads } = fakeAdmin()
    await loadPlatformStats(admin)
    const afterFirst = reads.length

    vi.setSystemTime(new Date("2026-11-05T21:01:00Z")) // one minute: still held
    await loadPlatformStats(admin)
    expect(reads.length).toBe(afterFirst)

    vi.setSystemTime(new Date("2026-11-05T21:03:00Z")) // past two minutes: tried again
    await loadPlatformStats(admin)
    expect(reads.length).toBeGreaterThan(afterFirst)
  })

  it("holds a complete answer for the full hour", async () => {
    const { loadPlatformStats } = await freshModule()
    programsLookup.mockResolvedValue(new Set(["duke", "unc"]))

    const { admin, reads } = fakeAdmin()
    const first = await loadPlatformStats(admin)
    expect(first.programs).toBe(2)
    const afterFirst = reads.length

    vi.setSystemTime(new Date("2026-11-05T21:50:00Z"))
    await loadPlatformStats(admin)
    expect(reads.length).toBe(afterFirst)
  })

  it("reuses the last good programs count when the lookup later fails", async () => {
    const { loadPlatformStats } = await freshModule()
    const { admin } = fakeAdmin()

    programsLookup.mockResolvedValue(new Set(["duke", "unc", "ncstate"]))
    expect((await loadPlatformStats(admin)).programs).toBe(3)

    // An hour on, the lookup fails. The number a family reads should not drop to zero.
    vi.setSystemTime(new Date("2026-11-05T22:30:00Z"))
    programsLookup.mockRejectedValue(new Error("timeout"))
    expect((await loadPlatformStats(admin)).programs).toBe(3)
  })

  it("collapses concurrent callers into a single sweep", async () => {
    const { loadPlatformStats } = await freshModule()
    programsLookup.mockResolvedValue(new Set(["duke"]))

    const { admin, reads } = fakeAdmin()
    // Started in the same tick, as three requests arriving at one cold lambda would be.
    const [a, b, c] = await Promise.all([loadPlatformStats(admin), loadPlatformStats(admin), loadPlatformStats(admin)])

    expect(a).toEqual(b)
    expect(b).toEqual(c)
    // Three simultaneous requests, one sweep: the user_profiles table is read once, not three times.
    expect(reads.filter((t) => t === "user_profiles").length).toBe(1)
  })
})
