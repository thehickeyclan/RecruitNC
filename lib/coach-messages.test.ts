import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  DAILY_NEW_THREADS,
  MAX_BODY,
  canMessage,
  cleanBody,
  coachLabel,
  coachSend,
  getThread,
  isApprovedCoach,
  listThreads,
  replyInThread,
  setStopped,
} from "./coach-messages"

/** Just enough of the Supabase query builder, in memory, to run the real rules. */
function fakeDb(seed: Record<string, Array<Record<string, unknown>>>) {
  const tables: Record<string, Array<Record<string, unknown>>> = Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  )
  let n = 0
  const table = (name: string) => (tables[name] ??= [])

  function query(name: string) {
    const filters: Array<(r: Record<string, unknown>) => boolean> = []
    let op: "select" | "insert" | "update" | "upsert" = "select"
    let payload: Record<string, unknown> | Record<string, unknown>[] | null = null
    let head = false
    let order: { col: string; asc: boolean } | null = null
    let limitN: number | null = null
    let conflict: string[] = []

    const run = () => {
      if (op === "insert") {
        const rows: Array<Record<string, unknown>> = (Array.isArray(payload) ? payload : [payload!]).map((r) => ({ id: `id-${++n}`, created_at: new Date().toISOString(), ...r }))
        for (const r of rows) {
          if (name === "coach_threads" && table(name).some((t) => t.coach_user_id === r.coach_user_id && t.athlete_id === r.athlete_id)) {
            return { data: null, error: { code: "23505", message: "duplicate" } }
          }
        }
        table(name).push(...rows)
        return { data: rows, error: null }
      }
      if (op === "upsert") {
        const r = payload as Record<string, unknown>
        const hit = table(name).find((t) => conflict.every((c) => t[c] === r[c]))
        if (hit) Object.assign(hit, r)
        else table(name).push({ ...r })
        return { data: [r], error: null }
      }
      let rows = table(name).filter((r) => filters.every((f) => f(r)))
      if (op === "update") {
        for (const r of rows) Object.assign(r, payload)
        return { data: rows, error: null }
      }
      if (order) {
        const { col, asc } = order
        rows = [...rows].sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (asc ? 1 : -1))
      }
      if (limitN != null) rows = rows.slice(0, limitN)
      return { data: head ? null : rows, count: rows.length, error: null }
    }

    const b: Record<string, unknown> = {
      select: (_c?: string, o?: { head?: boolean }) => ((head = Boolean(o?.head)), b),
      insert: (p: Record<string, unknown>) => ((op = "insert"), (payload = p), b),
      update: (p: Record<string, unknown>) => ((op = "update"), (payload = p), b),
      upsert: (p: Record<string, unknown>, o?: { onConflict?: string }) => ((op = "upsert"), (payload = p), (conflict = (o?.onConflict ?? "").split(",")), b),
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
      gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), b),
      order: (col: string, o?: { ascending?: boolean }) => ((order = { col, asc: o?.ascending !== false }), b),
      limit: (k: number) => ((limitN = k), b),
      maybeSingle: async () => {
        const r = run()
        return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }
      },
      single: async () => {
        const r = run()
        const row = Array.isArray(r.data) ? r.data[0] ?? null : r.data
        return { data: row, error: r.error ?? (row ? null : { message: "no rows" }) }
      },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    }
    return b
  }

  return { client: { from: query } as unknown as SupabaseClient, tables }
}

const COACH = "coach-1"
const UNREVIEWED = "coach-2"
const KID = "kid-1"
const MOM = "mom-1"
const STRANGER = "stranger-1"
const ATHLETE = "ath-1"

function seed() {
  return fakeDb({
    user_profiles: [
      { user_id: COACH, role: "college_coach", verified_coach: true, verification_status: "approved", email: "jsmith@campbell.edu", institution: "Campbell", full_name: "John Smith" },
      { user_id: UNREVIEWED, role: "college-coach", verified_coach: true, verification_status: "pending", email: "x@duke.edu", full_name: "Pat Lee" },
      { user_id: KID, role: "athlete", full_name: "Liam Jones" },
      { user_id: MOM, role: "parent", full_name: "Kate Jones" },
      { user_id: STRANGER, role: "parent", full_name: "Someone Else" },
    ],
    athletes: [{ id: ATHLETE, name: "Liam Jones", claimed_by_user_id: KID }],
    parent_athlete_links: [{ athlete_id: ATHLETE, user_id: MOM }],
    coach_threads: [],
    coach_messages: [],
    coach_thread_reads: [],
  })
}

describe("isApprovedCoach", () => {
  it("needs Matt's review, not just the sign-up flag", () => {
    expect(isApprovedCoach({ role: "college_coach", verified_coach: true, verification_status: "approved" })).toBe(true)
    // Access-first sign-up sets verified_coach before anyone has looked.
    expect(isApprovedCoach({ role: "college_coach", verified_coach: true, verification_status: "pending" })).toBe(false)
    expect(isApprovedCoach({ role: "college_coach", verified_coach: false, verification_status: "approved" })).toBe(false)
    expect(isApprovedCoach({ role: "parent", verified_coach: true, verification_status: "approved" })).toBe(false)
    expect(isApprovedCoach(null)).toBe(false)
  })
})

describe("cleanBody / coachLabel", () => {
  it("trims, refuses empty and over-long text", () => {
    expect(cleanBody("  hi \r\n there ")).toEqual({ ok: true, body: "hi \n there" })
    expect(cleanBody("   ").ok).toBe(false)
    expect(cleanBody(42).ok).toBe(false)
    expect(cleanBody("x".repeat(MAX_BODY + 1)).ok).toBe(false)
  })
  it("names the coach by surname", () => {
    expect(coachLabel("John Smith")).toBe("Coach Smith")
    expect(coachLabel("")).toBe("A coach")
  })
})

describe("who may start a conversation", () => {
  it("a reviewed coach can; the thread carries their program", async () => {
    const { client, tables } = seed()
    const r = await coachSend(client, COACH, ATHLETE, "Hi Liam, Coach Smith at Campbell.")
    expect(r.ok).toBe(true)
    expect(tables.coach_threads).toHaveLength(1)
    expect(tables.coach_threads[0].program).toBe("Campbell")
    expect(tables.coach_messages[0].sender_role).toBe("coach")
  })

  it("an unreviewed coach, a parent and the athlete cannot", async () => {
    const { client, tables } = seed()
    expect((await coachSend(client, UNREVIEWED, ATHLETE, "hi")).ok).toBe(false)
    expect((await coachSend(client, MOM, ATHLETE, "hi")).ok).toBe(false)
    expect((await coachSend(client, KID, ATHLETE, "hi")).ok).toBe(false)
    expect(tables.coach_threads).toHaveLength(0)
    expect((await canMessage(client, UNREVIEWED, ATHLETE)).ok).toBe(false)
  })

  it("a second message reuses the thread", async () => {
    const { client, tables } = seed()
    await coachSend(client, COACH, ATHLETE, "one")
    const again = await coachSend(client, COACH, ATHLETE, "two")
    expect(again.ok && again.isNewThread).toBe(false)
    expect(tables.coach_threads).toHaveLength(1)
    expect(tables.coach_messages).toHaveLength(2)
  })

  it("caps new conversations per day", async () => {
    const { client, tables } = seed()
    const now = new Date().toISOString()
    for (let i = 0; i < DAILY_NEW_THREADS; i++) {
      tables.coach_threads.push({ id: `t${i}`, coach_user_id: COACH, athlete_id: `other-${i}`, created_at: now, last_message_at: now })
    }
    const r = await coachSend(client, COACH, ATHLETE, "hi")
    expect(r.ok).toBe(false)
    expect(!r.ok && r.status).toBe(429)
  })
})

describe("who may read and reply", () => {
  it("the athlete and every linked parent see it and can reply; a stranger cannot", async () => {
    const { client } = seed()
    const sent = await coachSend(client, COACH, ATHLETE, "hello")
    if (!sent.ok) throw new Error("send failed")

    expect((await getThread(client, sent.threadId, KID))?.viewerRole).toBe("athlete")
    expect((await getThread(client, sent.threadId, MOM))?.viewerRole).toBe("parent")
    expect(await getThread(client, sent.threadId, STRANGER)).toBeNull()

    const reply = await replyInThread(client, sent.threadId, MOM, "Thanks coach")
    expect(reply.ok && reply.senderRole).toBe("parent")
    expect((await replyInThread(client, sent.threadId, STRANGER, "hey")).ok).toBe(false)

    const momInbox = await listThreads(client, MOM)
    expect(momInbox).toHaveLength(1)
    expect(await listThreads(client, STRANGER)).toHaveLength(0)
  })

  it("stop cuts the coach off, but the family can still read", async () => {
    const { client } = seed()
    const sent = await coachSend(client, COACH, ATHLETE, "hello")
    if (!sent.ok) throw new Error("send failed")

    expect((await setStopped(client, sent.threadId, COACH, true)).ok).toBe(false) // only family
    expect((await setStopped(client, sent.threadId, KID, true)).ok).toBe(true)

    expect((await replyInThread(client, sent.threadId, COACH, "again")).ok).toBe(false)
    expect((await coachSend(client, COACH, ATHLETE, "again")).ok).toBe(false)
    expect((await getThread(client, sent.threadId, MOM))?.messages).toHaveLength(1)
  })
})
