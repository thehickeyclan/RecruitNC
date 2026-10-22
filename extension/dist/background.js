"use strict";
(() => {
  // extension/src/background.ts
  var BASES = ["https://www.recruitwrestlers.com", "https://app.ncwrestlingunited.com"];
  var CACHE_MS = 2 * 60 * 1e3;
  var cache = null;
  async function bases() {
    const { base: base2 } = await chrome.storage.local.get("base");
    const pinned = typeof base2 === "string" && /^https?:\/\//.test(base2) ? [base2.replace(/\/$/, "")] : [];
    return [...pinned, ...BASES.filter((b) => !pinned.includes(b))];
  }
  async function base() {
    return cache?.base ?? (await bases())[0];
  }
  async function load(fresh = false) {
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
    let first = null;
    for (const b of await bases()) {
      const res = await fetch(`${b}/api/questionnaire/helper`, { credentials: "include", cache: "no-store" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({ signedIn: false })) : { signedIn: false, offline: true };
      if (res?.status === 403 && data.signedIn === void 0) continue;
      first ??= { data, base: b };
      if (data.signedIn) {
        cache = { at: Date.now(), data, base: b };
        return data;
      }
    }
    first ??= { data: { signedIn: false }, base: BASES[BASES.length - 1] };
    cache = { at: Date.now(), ...first };
    return first.data;
  }
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    void (async () => {
      if (msg.type === "load") return reply(await load(msg.fresh));
      if (msg.type === "markDone" && msg.schoolId) {
        const res = await fetch(`${await base()}/api/college-list`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId: msg.schoolId, questionnaireDone: true, via: "helper" })
        }).catch(() => null);
        cache = null;
        return reply({ ok: Boolean(res?.ok) });
      }
      if (msg.type === "open" && msg.path?.startsWith("/")) {
        await chrome.tabs.create({ url: `${await base()}${msg.path}` });
        return reply({ ok: true });
      }
      reply(null);
    })();
    return true;
  });
})();
