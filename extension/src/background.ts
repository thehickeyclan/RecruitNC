/**
 * Talks to NC United with the family's own signed-in session: reads their answers and form list
 * (/api/questionnaire/helper) and stamps a college submitted (/api/college-list). Content scripts
 * cannot call our API themselves - the college's page would be the origin - so they ask here.
 */
declare const chrome: any

const DEFAULT_BASE = "https://app.ncwrestlingunited.com"
const CACHE_MS = 2 * 60 * 1000
let cache: { at: number; data: unknown } | null = null

async function base(): Promise<string> {
  const { base } = await chrome.storage.local.get("base")
  return typeof base === "string" && /^https?:\/\//.test(base) ? base.replace(/\/$/, "") : DEFAULT_BASE
}

async function load(fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data
  const res = await fetch(`${await base()}/api/questionnaire/helper`, { credentials: "include", cache: "no-store" }).catch(() => null)
  const data = res ? await res.json().catch(() => ({ signedIn: false })) : { signedIn: false, offline: true }
  cache = { at: Date.now(), data }
  return data
}

chrome.runtime.onMessage.addListener((msg: { type: string; schoolId?: string; path?: string; fresh?: boolean }, _sender: unknown, reply: (v: unknown) => void) => {
  void (async () => {
    if (msg.type === "load") return reply(await load(msg.fresh))
    if (msg.type === "markDone" && msg.schoolId) {
      const res = await fetch(`${await base()}/api/college-list`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: msg.schoolId, questionnaireDone: true, via: "helper" }),
      }).catch(() => null)
      cache = null
      return reply({ ok: Boolean(res?.ok) })
    }
    if (msg.type === "open" && msg.path?.startsWith("/")) {
      await chrome.tabs.create({ url: `${await base()}${msg.path}` })
      return reply({ ok: true })
    }
    reply(null)
  })()
  return true
})

export {}
