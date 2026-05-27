/** Warm `/api/athlete/[id]` once per session when user hovers a profile link. */
const prefetchedIds = new Set<string>()

export function prefetchAthleteProfile(athleteId: string | null | undefined): void {
  const id = athleteId?.trim()
  if (!id || prefetchedIds.has(id)) return
  prefetchedIds.add(id)

  if (typeof window === "undefined") return

  void fetch(`/api/athlete/${encodeURIComponent(id)}`, {
    credentials: "include",
    priority: "low",
  } as RequestInit).catch(() => {
    prefetchedIds.delete(id)
  })
}
