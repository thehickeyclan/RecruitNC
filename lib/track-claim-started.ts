/**
 * "Claim started": someone who found a wrestler pressed to claim him (Matt, 2 Nov 2026, the
 * funnel dashboard's found-to-claimed step). Once per wrestler per browser session, so a parent
 * who goes back and forth through sign-up counts once. Never blocks the click it rides on.
 */
export function trackClaimStarted(athleteId: string, from: "profile" | "find") {
  try {
    const key = `claim-started:${athleteId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
  } catch {
    /* No storage: count it anyway. */
  }
  void fetch("/api/track-funnel-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "claim_started", path: window.location.pathname, source: from, athlete_id: athleteId }),
    keepalive: true,
  }).catch(() => {})
}
