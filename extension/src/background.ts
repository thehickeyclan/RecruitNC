/**
 * Talks to RecruitWrestlers with the family's own signed-in session: reads their answers and form list
 * (/api/questionnaire/helper) and stamps a college submitted (/api/college-list). Content scripts
 * cannot call our API themselves - the college's page would be the origin - so they ask here.
 */
declare const chrome: any

/*
 * The same site answers on both addresses: RecruitWrestlers, and NC United's for North Carolina
 * families (licensed). A family is signed in on one of them; the helper uses whichever is.
 */
const BASES = ["https://www.recruitwrestlers.com", "https://app.ncwrestlingunited.com"]
const CACHE_MS = 2 * 60 * 1000
let cache: { at: number; data: unknown; base: string } | null = null

async function bases(): Promise<string[]> {
  const { base } = await chrome.storage.local.get("base")
  const pinned = typeof base === "string" && /^https?:\/\//.test(base) ? [base.replace(/\/$/, "")] : []
  return [...pinned, ...BASES.filter((b) => !pinned.includes(b))]
}

async function base(): Promise<string> {
  return cache?.base ?? (await bases())[0]
}

async function load(fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data
  let first: { data: unknown; base: string } | null = null
  for (const b of await bases()) {
    const res = await fetch(`${b}/api/questionnaire/helper`, { credentials: "include", cache: "no-store" }).catch(() => null)
    const data = res ? await res.json().catch(() => ({ signedIn: false })) : { signedIn: false, offline: true }
    // Before launch recruitwrestlers.com answers "Not available yet" (403, no signedIn): not this one.
    if (res?.status === 403 && (data as { signedIn?: boolean }).signedIn === undefined) continue
    first ??= { data, base: b }
    if ((data as { signedIn?: boolean }).signedIn) {
      cache = { at: Date.now(), data, base: b }
      return data
    }
  }
  first ??= { data: { signedIn: false }, base: BASES[BASES.length - 1] }
  cache = { at: Date.now(), ...first }
  return first.data
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
