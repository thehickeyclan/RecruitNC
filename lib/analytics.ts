// Client-side analytics helper
export const trackPageView = async (pageUrl?: string, referrer?: string) => {
  try {
    // Only track in production or when explicitly enabled
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
      return
    }

    const url = pageUrl || window.location.pathname + window.location.search
    const ref = referrer || document.referrer

    await fetch("/api/track-page-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_url: url,
        referrer: ref || null,
      }),
    })
  } catch (error) {
    // Silent fail - don't break user experience
    console.debug("Analytics tracking failed:", error)
  }
}

// Hook for React components
export const usePageTracking = () => {
  const track = (pageUrl?: string) => {
    trackPageView(pageUrl)
  }

  return { track }
}
