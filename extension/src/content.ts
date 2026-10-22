/**
 * Runs on college questionnaire pages (ARMS, SIDEARM, Front Rush, JumpForward, ARI) and, when the
 * family presses the toolbar button, on any other page. It shows a small RecruitWrestlers panel; "Fill"
 * types the family's answers in. The family checks the form and presses the college's own Submit.
 * When the college's thank-you page appears after that, the college is stamped submitted on the
 * family's list, with the time.
 */
import { fillPage, looksSubmitted, schoolForUrl } from "./fill"
import type { Answers } from "../../lib/questionnaire/fields"

declare const chrome: any

type Wrestler = { id: string; firstName: string; side: string; answers: Answers }
type Form = { schoolId: string; name: string; urls: string[]; done: boolean }
type Data = { signedIn: boolean; access?: boolean; wrestlers?: Wrestler[]; forms?: Form[] }

const w = window as unknown as { __ncuHelper?: boolean }
const PENDING_MS = 20 * 60 * 1000
const send = (msg: Record<string, unknown>) => new Promise<any>((resolve) => chrome.runtime.sendMessage(msg, resolve))

if (!w.__ncuHelper) {
  w.__ncuHelper = true
  void start()
}

/** The page-world helper (page.ts), for date pickers only the page's own code can set. */
function injectPageHelper() {
  if (document.getElementById("ncu-page-helper")) return
  const script = document.createElement("script")
  script.id = "ncu-page-helper"
  script.src = chrome.runtime.getURL("dist/page.js")
  document.documentElement.appendChild(script)
}
const hooks = { setDate: (id: string, iso: string) => window.postMessage({ ncu: "set-date", id, iso }, location.origin) }

async function start() {
  const looksLikeForm = () => document.querySelectorAll("input:not([type=hidden]), select, textarea").length >= 3
  // Our own Interest forms page: remember which college's form the family is opening.
  if (/recruitwrestlers\.com|ncwrestlingunited\.com|localhost/.test(location.hostname)) {
    document.addEventListener("click", (e) => {
      const a = (e.target as Element).closest?.("a[data-ncu-form]") as HTMLAnchorElement | null
      if (a) void chrome.storage.local.set({ lastOpened: { schoolId: a.dataset.ncuForm, at: Date.now() } })
    })
    return
  }

  const data: Data = await send({ type: "load" })
  const forms = data?.forms ?? []
  const { lastOpened } = await chrome.storage.local.get("lastOpened")
  const schoolId = schoolForUrl(location.href, forms) ?? (lastOpened && Date.now() - lastOpened.at < PENDING_MS ? lastOpened.schoolId : null)
  const form = forms.find((f) => f.schoolId === schoolId) ?? null

  await checkSubmitted()
  new MutationObserver(() => void checkSubmitted()).observe(document.body, { childList: true, subtree: true, characterData: true })

  const { forceOpen } = await chrome.storage.local.get("forceOpen")
  void chrome.storage.local.remove("forceOpen")
  // ARMS opens on a welcome screen with no boxes; the form appears after "Continue". Wait for it.
  if (!forceOpen && !looksLikeForm()) {
    await new Promise<void>((resolve) => {
      const watch = new MutationObserver(() => {
        if (!looksLikeForm()) return
        watch.disconnect()
        resolve()
      })
      watch.observe(document.body, { childList: true, subtree: true })
    })
  }
  injectPageHelper()
  panel(data, form)

  async function checkSubmitted() {
    const { pending } = await chrome.storage.local.get("pending")
    if (!pending || pending.origin !== location.origin || Date.now() - pending.at > PENDING_MS) return
    if (!looksSubmitted(document.body.innerText)) return
    await chrome.storage.local.remove("pending")
    const res = await send({ type: "markDone", schoolId: pending.schoolId })
    toast(res?.ok ? `Marked submitted on your list: ${pending.name}, ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : `Submitted. Tap "Submitted" for ${pending.name} on your Interest forms page.`)
  }
}

function panel(data: Data, form: Form | null) {
  const host = document.createElement("div")
  host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647"
  const root = host.attachShadow({ mode: "open" })
  root.innerHTML = `
    <style>
      .box{font:14px/1.4 -apple-system,system-ui,sans-serif;background:#0B1426;color:#fff;border:1px solid #A3E635;border-radius:14px;padding:12px 14px;width:280px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
      .top{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#A3E635}
      .x{background:none;border:0;color:#fff9;font-size:18px;cursor:pointer}
      p{margin:6px 0 0;color:#ffffffc0;font-size:13px}
      button.go{margin-top:10px;width:100%;background:#A3E635;color:#0A1628;border:0;border-radius:9px;padding:9px;font-weight:900;font-size:14px;cursor:pointer}
      select{margin-top:8px;width:100%;padding:6px;border-radius:8px}
      a{color:#A3E635}
      .warn{color:#fcd34d}
      .left{color:#ffffff99;font-size:12px}
    </style>
    <div class="box"><div class="top"><span>RecruitWrestlers</span><button class="x" aria-label="Close">×</button></div><div class="body"></div></div>`
  root.querySelector(".x")!.addEventListener("click", () => host.remove())
  const body = root.querySelector(".body") as HTMLElement
  document.documentElement.appendChild(host)

  if (!data?.signedIn) {
    body.innerHTML = `<p>Sign in to RecruitWrestlers to fill this form with your answers.</p><button class="go">Sign in</button>`
    body.querySelector("button")!.addEventListener("click", () => void send({ type: "open", path: "/auth/signin?returnTo=/my-recruiting/questionnaires" }))
    return
  }
  if (!data.access || !data.wrestlers?.length) {
    body.innerHTML = `<p>Interest forms are part of the Recruiting Command Center.</p>`
    return
  }
  const wrestlers = data.wrestlers
  let who = wrestlers[0]
  body.innerHTML = `
    <p>${form ? `<b>${escape(form.name)}</b>${form.done ? " · already marked submitted" : ""}` : "College form"}</p>
    ${wrestlers.length > 1 ? `<select>${wrestlers.map((x) => `<option value="${x.id}">${escape(x.firstName)}</option>`).join("")}</select>` : ""}
    <button class="go">Fill ${escape(who.firstName)}'s answers</button>
    <p class="out"></p>`
  const go = body.querySelector("button.go") as HTMLButtonElement
  body.querySelector("select")?.addEventListener("change", (e) => {
    who = wrestlers.find((x) => x.id === (e.target as HTMLSelectElement).value) ?? who
    go.textContent = `Fill ${who.firstName}'s answers`
  })
  const out = body.querySelector(".out") as HTMLElement

  const run = () => {
    const r = fillPage({ ...who.answers, side: who.side }, document, hooks)
    out.innerHTML =
      `Filled ${r.filled} box${r.filled === 1 ? "" : "es"} (green). Check them, finish any in amber, then press <b>Submit</b> on this page.` +
      (r.needYou.length ? `<br><span class="warn">Not in your answers yet: ${escape(r.needYou.join(", "))}. <a href="#" class="edit">Add them</a></span>` : "") +
      (r.unmatched.length ? `<br><span class="left">Left for you: ${escape(r.unmatched.join(", "))}</span>` : "")
    out.querySelector(".edit")?.addEventListener("click", (e) => {
      e.preventDefault()
      void send({ type: "open", path: "/my-recruiting/questionnaires" })
    })
    return r
  }

  go.addEventListener("click", () => {
    run()
    // Some forms reset a box when another changes (Front Rush clears inches when feet is picked).
    setTimeout(run, 700)
    go.textContent = "Fill again"
    // Multi-step forms (ARMS asks name and email first): fill each new step as it appears.
    let t: ReturnType<typeof setTimeout> | undefined
    new MutationObserver(() => {
      clearTimeout(t)
      t = setTimeout(() => fillPage({ ...who.answers, side: who.side }, document, hooks), 400)
    }).observe(document.body, { childList: true, subtree: true })
    watchSubmit(form)
  })
}

/** The family pressed the college's own Submit: wait for its thank-you page. */
function watchSubmit(form: Form | null) {
  if (!form) return
  const mark = () => void chrome.storage.local.set({ pending: { schoolId: form.schoolId, name: form.name, origin: location.origin, at: Date.now() } })
  document.addEventListener("submit", mark, true)
  document.addEventListener(
    "click",
    (e) => {
      const b = (e.target as Element).closest?.("button, input[type=submit], input[type=button], a") as HTMLElement | null
      const text = (b?.innerText || (b as HTMLInputElement | null)?.value || "").trim()
      if (b && /^(submit|send|finish|complete|done|submit (form|questionnaire))\b/i.test(text)) mark()
    },
    true,
  )
}

function toast(text: string) {
  const el = document.createElement("div")
  el.textContent = text
  el.style.cssText = "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#0B1426;color:#fff;border:1px solid #22c55e;border-radius:12px;padding:10px 16px;font:600 14px -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)"
  document.documentElement.appendChild(el)
  setTimeout(() => el.remove(), 8000)
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
