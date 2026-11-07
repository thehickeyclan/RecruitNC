import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const batchSend = vi.fn()
const emailsSend = vi.fn()

vi.mock("resend", () => ({
  Resend: class {
    batch = { send: batchSend }
    emails = { send: emailsSend }
  },
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }))
vi.mock("@/lib/email-unsubscribe", () => ({
  filterUnsubscribed: async (_admin: unknown, emails: string[]) => ({ allowed: emails, suppressed: [] }),
  unsubscribeFooterHtml: () => "",
  unsubscribeHeaders: () => ({}),
  unsubscribeUrl: (base: string, email: string) => `${base}/u?e=${email}`,
}))
vi.mock("@/lib/admin-blast-email-html", () => ({ buildAdminBlastEmailHtml: () => "<p>hi</p>" }))
vi.mock("@/lib/email", () => ({ sendAdminBlastEmail: vi.fn(async () => ({ success: true })) }))

import { isReservedTestAddress, sendAdminBccEmails, sendAdminBlastEmails } from "@/lib/admin-messaging-blast-email"
import type { AdminMessagingRecipientRow } from "@/lib/admin-messaging-recipients"
import type { AdminBlastSender } from "@/lib/admin-blast-senders"

const sender = { from: "NC United <info@ncwrestlingunited.com>", logoVariant: "ncu", footer: "" } as unknown as AdminBlastSender
const rows = (emails: (string | null)[]) => emails.map((email) => ({ email }) as unknown as AdminMessagingRecipientRow)
const real = (n: number) => Array.from({ length: n }, (_, i) => `family${i}@gmail.com`)

describe("isReservedTestAddress", () => {
  it.each([
    "qa-family.recruitnc@example.com",
    "a@EXAMPLE.ORG",
    "a@example.net",
    "a@mail.example.com",
    "a@foo.test",
    "a@foo.invalid",
    "a@printer.local",
    "a@site.example",
    "a@localhost",
    " a@example.com ",
  ])("rejects %s", (e) => expect(isReservedTestAddress(e)).toBe(true))

  it.each(["a@gmail.com", "a@myexample.com", "a@example.co", "a@testing.com", "a@unc.edu", "a@local.com", "not-an-email"])("keeps %s", (e) =>
    expect(isReservedTestAddress(e)).toBe(false),
  )
})

describe("sendAdminBlastEmails", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    process.env.RESEND_API_KEY = "re_test"
    batchSend.mockReset()
    emailsSend.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Drains the pacing/backoff sleeps, which are scheduled across many awaits. */
  async function run<T>(p: Promise<T>): Promise<T> {
    let settled = false
    p.finally(() => (settled = true)).catch(() => {})
    while (!settled) await vi.advanceTimersByTimeAsync(1000)
    return p
  }

  it("drops test-domain addresses before batching and counts them as skipped", async () => {
    batchSend.mockImplementation(async (payload: unknown[]) => ({ data: { data: payload.map((_, i) => ({ id: `id${i}` })) }, error: null }))
    const result = await run(sendAdminBlastEmails(rows([...real(99), "qa-family.recruitnc@example.com", "x@foo.test", null]), { subject: "Hi", htmlBody: "<p>x</p>", sender }))
    expect(result).toMatchObject({ sent: 99, failed: 0, skippedNoEmail: 1, skippedTestAddress: 2 })
    const sentTo = batchSend.mock.calls.flatMap(([payload]) => (payload as { to: string[] }[]).map((m) => m.to[0]))
    expect(sentTo).toHaveLength(99)
    expect(sentTo.some((e) => e.endsWith("example.com") || e.endsWith(".test"))).toBe(false)
  })

  it("falls back to one-by-one sends when Resend rejects a batch for validation", async () => {
    batchSend.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field. Please use our testing email address instead of domains like `example.com`" },
    })
    emailsSend.mockImplementation(async (msg: { to: string[] }) =>
      msg.to[0] === "family7@gmail.com" ? { data: null, error: { name: "validation_error", message: "Invalid `to` field" } } : { data: { id: "x" }, error: null },
    )
    const result = await run(sendAdminBlastEmails(rows(real(100)), { subject: "Hi", htmlBody: "<p>x</p>", sender }))
    expect(batchSend).toHaveBeenCalledTimes(1)
    expect(emailsSend).toHaveBeenCalledTimes(100)
    expect(result).toMatchObject({ sent: 99, failed: 1 })
    expect(result.sampleError).toMatch(/Invalid `to` field/)
  })

  it("retries a rate-limited batch instead of falling back to singles", async () => {
    batchSend
      .mockResolvedValueOnce({ data: null, error: { name: "rate_limit_exceeded", message: "Too many requests" } })
      .mockImplementation(async (payload: unknown[]) => ({ data: { data: payload.map((_, i) => ({ id: `id${i}` })) }, error: null }))
    const result = await run(sendAdminBlastEmails(rows(real(20)), { subject: "Hi", htmlBody: "<p>x</p>", sender }))
    expect(batchSend).toHaveBeenCalledTimes(2)
    expect(emailsSend).not.toHaveBeenCalled()
    expect(result).toMatchObject({ sent: 20, failed: 0 })
  })

  it("does not fall back to singles on a server error (avoids double sends)", async () => {
    batchSend.mockResolvedValue({ data: null, error: { name: "internal_server_error", message: "Something went wrong" } })
    const result = await run(sendAdminBlastEmails(rows(real(20)), { subject: "Hi", htmlBody: "<p>x</p>", sender }))
    expect(emailsSend).not.toHaveBeenCalled()
    expect(result).toMatchObject({ sent: 0, failed: 20 })
  })

  it("only re-sends the rejected chunk, not the ones that went through", async () => {
    batchSend
      .mockImplementationOnce(async (payload: unknown[]) => ({ data: { data: payload.map((_, i) => ({ id: `id${i}` })) }, error: null }))
      .mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "Invalid `to` field" } })
    emailsSend.mockResolvedValue({ data: { id: "x" }, error: null })
    const result = await run(sendAdminBlastEmails(rows(real(150)), { subject: "Hi", htmlBody: "<p>x</p>", sender }))
    expect(emailsSend).toHaveBeenCalledTimes(50)
    expect(result).toMatchObject({ sent: 150, failed: 0 })
  })
})

describe("sendAdminBccEmails", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test"
    emailsSend.mockReset()
    emailsSend.mockResolvedValue({ data: { id: "x" }, error: null })
  })

  it("leaves test-domain addresses off the bcc line", async () => {
    const result = await sendAdminBccEmails(rows(["a@gmail.com", "qa@example.com", "b@unc.edu"]), { subject: "Hi", htmlBody: "<p>x</p>", sender })
    expect(result).toMatchObject({ sent: 2, skippedTestAddress: 1 })
    expect(emailsSend.mock.calls[0]![0].bcc).toEqual(["a@gmail.com", "b@unc.edu"])
  })
})
