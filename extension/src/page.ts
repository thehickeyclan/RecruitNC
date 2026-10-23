/**
 * Runs in the page's own world (content scripts cannot reach a page's JavaScript). Only job: set a
 * Telerik date picker - Front Rush's date of birth - through its own API, since typed text is not
 * parsed and the form would post an empty date. Takes a message from our content script only.
 */
declare const $find: undefined | ((id: string) => { set_selectedDate?: (d: Date) => void } | null)

window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data || e.data.ncu !== "set-date") return
  const { id, iso } = e.data as { id: string; iso: string }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m || typeof $find !== "function") return
  $find(id)?.set_selectedDate?.(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
})

export {}
