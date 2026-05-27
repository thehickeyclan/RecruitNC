/** Scroll to `window.location.hash` after client render (Next.js client pages miss native hash jump). */
export function scrollToPageHash(behavior: ScrollBehavior = "smooth") {
  if (typeof window === "undefined") return

  const id = window.location.hash.replace(/^#/, "")
  if (!id) return

  const attempt = () => {
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" })
  }

  attempt()
  requestAnimationFrame(attempt)
  window.setTimeout(attempt, 100)
  window.setTimeout(attempt, 350)
}
