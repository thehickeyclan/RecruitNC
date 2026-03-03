/**
 * Navigate to an internal URL via full page load. Use instead of router.push()
 * so no client-side navigation runs and no request gets canceled by the app.
 */
export function safeNavigate(path: string): void {
  if (typeof window === "undefined") return
  const url = path.startsWith("http") ? path : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
  window.location.href = url
}
