/** When false (default), TOC brackets are admin-only — pages and APIs return 404 for everyone else. */
export function tocBracketsPublicEnabled(): boolean {
  return process.env.TOC_BRACKETS_PUBLIC_ENABLED === "true"
}

const TOC_BRACKETS_PATH = "/tournament-of-champions/brackets"

/** Block athlete-facing emails from linking to brackets while they remain admin-only. */
export function assertTocAthleteEmailHasNoPrivateBracketsLink(content: string): void {
  if (tocBracketsPublicEnabled()) return
  if (content.includes(TOC_BRACKETS_PATH)) {
    throw new Error("TOC athlete emails must not link to brackets until TOC_BRACKETS_PUBLIC_ENABLED=true")
  }
}
